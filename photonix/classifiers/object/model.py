import os
import re
import sys

import numpy as np
from PIL import Image, ImageOps as PILImageOps

from photonix.classifiers.base_model import BaseModel, create_ort_session
from photonix.classifiers.image_utils import downscale_for_inference


GRAPH_FILE = os.path.join('object', 'object_backbone.onnx')
ANCHORS_FILE = os.path.join('object', 'object_anchors.npy')
LABEL_FILE = os.path.join('object', 'oid_v4_label_map.pbtxt')

# TF Object-Detection-API postprocessor parameters, read out of the frozen SSD
# MobileNet v2 OID v4 graph during conversion (see
# scripts/convert_models_to_onnx.py::do_object_backbone). The full object.onnx
# embedded the batch-multiclass-NMS postprocessor as ONNX Loop/If subgraphs,
# whose ORT initialisation cost ~60s and wrecked the lazy-load/idle-unload
# lifecycle. object_backbone.onnx stops at the raw pre-NMS tensors and we
# reproduce decode + NMS here in vectorised numpy (session init drops to <5s
# with byte-identical detections).
#
#   - faster_rcnn_box_coder scale factors [ty, tx, th, tw]
#   - class scores via sigmoid(logits / logit_scale); background at index 0
#   - BatchMultiClassNonMaxSuppression: IoU 0.6, score threshold 0.3, up to
#     100 detections per class and 100 total, sorted by score descending
BOX_CODER_SCALES = np.array([10.0, 10.0, 5.0, 5.0], dtype=np.float32)
LOGIT_SCALE = 1.0
NMS_IOU_THRESHOLD = 0.6
NMS_SCORE_THRESHOLD = 0.3
NMS_MAX_PER_CLASS = 100
NMS_MAX_TOTAL = 100


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def decode_boxes(box_encodings, anchors, scales=BOX_CODER_SCALES):
    """Decode faster_rcnn_box_coder encodings against corner-format anchors.

    ``box_encodings`` is ``[N, 4]`` as ``(ty, tx, th, tw)`` and ``anchors`` is
    ``[N, 4]`` as ``(ymin, xmin, ymax, xmax)``. Returns ``[N, 4]`` boxes as
    ``(ymin, xmin, ymax, xmax)``. Fully vectorised - no per-anchor loop.
    """
    ymin_a, xmin_a, ymax_a, xmax_a = (anchors[:, 0], anchors[:, 1],
                                      anchors[:, 2], anchors[:, 3])
    ha = ymax_a - ymin_a
    wa = xmax_a - xmin_a
    ycenter_a = ymin_a + 0.5 * ha
    xcenter_a = xmin_a + 0.5 * wa

    ty = box_encodings[:, 0] / scales[0]
    tx = box_encodings[:, 1] / scales[1]
    th = box_encodings[:, 2] / scales[2]
    tw = box_encodings[:, 3] / scales[3]

    w = np.exp(tw) * wa
    h = np.exp(th) * ha
    ycenter = ty * ha + ycenter_a
    xcenter = tx * wa + xcenter_a

    ymin = ycenter - 0.5 * h
    xmin = xcenter - 0.5 * w
    ymax = ycenter + 0.5 * h
    xmax = xcenter + 0.5 * w
    return np.stack([ymin, xmin, ymax, xmax], axis=1)


def _nms_single_class(boxes, scores, iou_threshold, max_output):
    """Greedy IoU NMS matching tf.image.non_max_suppression (a box is
    suppressed when its IoU with an already-kept, higher-scoring box exceeds
    ``iou_threshold``). ``boxes`` is ``[M, 4]`` as ``(y1, x1, y2, x2)``.
    Returns indices into the input arrays."""
    order = scores.argsort()[::-1]
    y1, x1, y2, x2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = np.maximum(0.0, y2 - y1) * np.maximum(0.0, x2 - x1)
    keep = []
    while order.size > 0 and len(keep) < max_output:
        i = order[0]
        keep.append(i)
        rest = order[1:]
        if rest.size == 0:
            break
        yy1 = np.maximum(y1[i], y1[rest])
        xx1 = np.maximum(x1[i], x1[rest])
        yy2 = np.minimum(y2[i], y2[rest])
        xx2 = np.minimum(x2[i], x2[rest])
        inter = np.maximum(0.0, yy2 - yy1) * np.maximum(0.0, xx2 - xx1)
        union = areas[i] + areas[rest] - inter
        iou = np.where(union > 0, inter / np.maximum(union, 1e-12), 0.0)
        order = rest[iou <= iou_threshold]
    return keep


def multiclass_postprocess(box_encodings, class_logits, anchors):
    """Reproduce the TF OD API BatchMultiClassNonMaxSuppression postprocessor.

    ``box_encodings`` is ``[N, 4]`` and ``class_logits`` is ``[N, C + 1]`` with
    background at column 0. Returns ``(boxes[K, 4], scores[K], classes[K])``
    sorted by score descending, ``K <= NMS_MAX_TOTAL``. Class ids are the
    1-indexed label-map ids (background removed).
    """
    scores = _sigmoid(class_logits / LOGIT_SCALE)[:, 1:]  # drop background
    boxes = decode_boxes(box_encodings, anchors)

    # Clip boxes to the normalised image window before NMS (TF clip_to_window).
    boxes = np.stack([
        np.clip(boxes[:, 0], 0.0, 1.0),
        np.clip(boxes[:, 1], 0.0, 1.0),
        np.clip(boxes[:, 2], 0.0, 1.0),
        np.clip(boxes[:, 3], 0.0, 1.0),
    ], axis=1)

    all_boxes, all_scores, all_classes = [], [], []
    # Only classes with a candidate above the score threshold can contribute.
    for c in np.where(scores.max(axis=0) > NMS_SCORE_THRESHOLD)[0]:
        cand = np.where(scores[:, c] > NMS_SCORE_THRESHOLD)[0]
        if cand.size == 0:
            continue
        keep_local = _nms_single_class(boxes[cand], scores[cand, c],
                                       NMS_IOU_THRESHOLD, NMS_MAX_PER_CLASS)
        kept = cand[keep_local]
        all_boxes.append(boxes[kept])
        all_scores.append(scores[kept, c])
        all_classes.append(np.full(len(kept), c + 1, dtype=np.int64))

    if not all_boxes:
        return (np.zeros((0, 4), np.float32), np.zeros((0,), np.float32),
                np.zeros((0,), np.int64))

    boxes_out = np.concatenate(all_boxes, axis=0)
    scores_out = np.concatenate(all_scores, axis=0)
    classes_out = np.concatenate(all_classes, axis=0)
    order = scores_out.argsort()[::-1][:NMS_MAX_TOTAL]
    return boxes_out[order], scores_out[order], classes_out[order]


def parse_label_map(label_file):
    """Parse a TF object-detection label map into a category index.

    The label map is a flat sequence of blocks:
        item {
          name: "/m/011k07"
          id: 1
          display_name: "Tortoise"
        }
    This produces the same structure the old protobuf-based label_map_util
    returned: {id: {'id': id, 'name': display_name}}, preferring display_name
    and falling back to name, keeping the first item seen for any given id.
    """
    with open(label_file) as f:
        text = f.read()

    category_index = {}
    for block in re.findall(r'item\s*\{([^}]*)\}', text):
        id_match = re.search(r'\bid:\s*(\d+)', block)
        name_match = re.search(r'display_name:\s*"([^"]*)"', block)
        if not name_match:
            name_match = re.search(r'\bname:\s*"([^"]*)"', block)
        if id_match and name_match:
            item_id = int(id_match.group(1))
            if item_id > 0 and item_id not in category_index:
                category_index[item_id] = {'id': item_id, 'name': name_match.group(1)}
    return category_index


class ObjectModel(BaseModel):
    name = 'object'
    version = 20260719
    approx_ram_mb = 800

    def __init__(self, model_dir=None, graph_file=GRAPH_FILE, label_file=LABEL_FILE,
                 anchors_file=ANCHORS_FILE, lock_name=None):
        super().__init__(model_dir=model_dir)

        self._graph_file = os.path.join(self.model_dir, graph_file)
        self._anchors_file = os.path.join(self.model_dir, anchors_file)
        self._label_file = os.path.join(self.model_dir, label_file)
        self._lock_name = lock_name
        self.labels = None
        self.anchors = None
        self.session = None
        self.input_name = None
        self.output_names = None

        # Download model files eagerly (cheap), but don't load into memory yet
        self.ensure_downloaded(lock_name=lock_name)

    def load(self):
        # Reuse a single ONNX Runtime session across photos (and across
        # re-instantiated models in this process) instead of building one per
        # prediction.
        session_key = f'{self.graph_cache_key}:session'
        with self.load_lock():
            if session_key in self.graph_cache:
                self.session = self.graph_cache[session_key]
            else:
                self.session = create_ort_session(self._graph_file)
                self.graph_cache[session_key] = self.session

        self.labels = self.load_labels(self._label_file)
        self.anchors = np.load(self._anchors_file).astype(np.float32)

        # The backbone ONNX exposes the raw pre-NMS tensors ('concat:0' class
        # logits [1, N, C+1] and 'Squeeze:0' box encodings [1, N, 4]). Map
        # inputs/outputs by name rather than position.
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [output.name for output in self.session.get_outputs()]

    def load_labels(self, label_file):
        return parse_label_map(label_file)

    def load_image_into_numpy_array(self, image):
        return np.asarray(image, dtype=np.uint8)

    def run_inference_for_single_image(self, image):
        # The backbone expects a batch: [1, height, width, 3] uint8 and returns
        # the raw pre-NMS class logits and box encodings.
        outputs = self.session.run(self.output_names,
                                   {self.input_name: np.expand_dims(image, 0)})

        # Identify the two outputs by their trailing dimension (4 == box
        # encodings, otherwise the per-class logits) so we don't depend on the
        # order onnxruntime lists them in.
        class_logits = box_encodings = None
        for value in outputs:
            array = value[0]
            if array.shape[-1] == 4:
                box_encodings = array
            else:
                class_logits = array

        boxes, scores, classes = multiclass_postprocess(
            box_encodings, class_logits, self.anchors)

        # Keep the exact output_dict shape the old full-graph model produced so
        # format_output and callers are unchanged: detections are already sorted
        # by score descending.
        return {
            'num_detections': int(len(scores)),
            'detection_boxes': boxes,
            'detection_scores': scores,
            'detection_classes': classes.astype(np.uint16),
        }

    def format_output(self, output_dict, min_score):
        results = []
        for i, score in enumerate(output_dict['detection_scores']):
            if score < min_score:
                break

            box = list(output_dict['detection_boxes'][i])
            width = box[3] - box[1]
            height = box[2] - box[0]

            results.append({
                'label':        self.labels[output_dict['detection_classes'][i]]['name'],
                'score':        score,
                'x':            np.mean([box[1], box[3]]),
                'y':            np.mean([box[0], box[2]]),
                'width':        width,
                'height':       height,
                'significance': score * width * height,
                'box':          box,
            })
        return results

    def predict(self, image_file, min_score=0.1, photo_file=None):
        self._ensure_loaded()  # Lazy load on first use

        image = Image.open(image_file)

        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Apply rotation: EXIF + user rotation if photo_file provided
        if photo_file is not None:
            from photonix.photos.utils.rotation import apply_photo_rotation
            image = apply_photo_rotation(image, photo_file)
        else:
            # Fallback: just apply EXIF orientation correction
            image = PILImageOps.exif_transpose(image)

        # Cap inference resolution. Detection outputs are relative (0-1), so
        # the discarded scale factor doesn't affect anything downstream.
        image, _ = downscale_for_inference(image)

        # the array based representation of the image will be used later in order to prepare the
        # result image with boxes and labels on it.
        image_np = self.load_image_into_numpy_array(image)
        # Expand dimensions since the model expects images to have shape: [1, None, None, 3]
        np.expand_dims(image_np, axis=0)
        # Actual detection.
        output_dict = self.run_inference_for_single_image(image_np)
        return self.format_output(output_dict, min_score)


def save_tags(photo, results, model):
    from photonix.classifiers.runners import get_or_create_tag
    from photonix.photos.models import PhotoTag

    for result in results:
        if result['label'] != 'Human face':  # We have a specialised face detector
            tag = get_or_create_tag(library=photo.library, name=result['label'], type='O', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=result['score'], significance=result['significance'], position_x=result['x'], position_y=result['y'], size_x=result['width'], size_y=result['height']).save()


def run_on_photo(photo_id):
    from photonix.classifiers.runners import run_classifier_on_photo
    return run_classifier_on_photo('object', ObjectModel, photo_id, 'O', save_tags)


if __name__ == '__main__':
    model = ObjectModel()
    if len(sys.argv) != 2:
        print('Argument required: image file path or Photo ID')
        exit(1)

    results = run_on_photo(sys.argv[1])

    for result in results:
        print('{} (score: {:0.5f}, significance: {:0.5f}, x: {:0.5f}, y: {:0.5f}, width: {:0.5f}, height: {:0.5f})'.format(result['label'], result['score'], result['significance'], result['x'], result['y'], result['width'], result['height']))
