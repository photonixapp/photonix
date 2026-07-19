import os
import re
import sys

import numpy as np
from PIL import Image, ImageOps as PILImageOps

from photonix.classifiers.base_model import BaseModel, create_ort_session
from photonix.classifiers.image_utils import downscale_for_inference


GRAPH_FILE = os.path.join('object', 'object.onnx')
LABEL_FILE = os.path.join('object', 'oid_v4_label_map.pbtxt')


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

    def __init__(self, model_dir=None, graph_file=GRAPH_FILE, label_file=LABEL_FILE, lock_name=None):
        super().__init__(model_dir=model_dir)

        self._graph_file = os.path.join(self.model_dir, graph_file)
        self._label_file = os.path.join(self.model_dir, label_file)
        self._lock_name = lock_name
        self.labels = None
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

        # tf2onnx keeps the TF tensor names ('image_tensor:0', 'num_detections:0'
        # etc.), so map inputs/outputs by name rather than by position.
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [output.name for output in self.session.get_outputs()]

    def load_labels(self, label_file):
        return parse_label_map(label_file)

    def load_image_into_numpy_array(self, image):
        return np.asarray(image, dtype=np.uint8)

    def run_inference_for_single_image(self, image):
        # The model expects a batch: [1, height, width, 3] uint8.
        outputs = self.session.run(self.output_names,
                                   {self.input_name: np.expand_dims(image, 0)})

        # Map by output name (stripping the ':0' tensor suffix) so we don't
        # depend on the order onnxruntime lists the outputs in.
        output_dict = {name.split(':')[0]: value
                       for name, value in zip(self.output_names, outputs)}

        # all outputs are float32 numpy arrays, so convert types as appropriate
        output_dict['num_detections'] = int(output_dict['num_detections'][0])
        output_dict['detection_classes'] = output_dict['detection_classes'][0].astype(np.uint16)
        output_dict['detection_boxes'] = output_dict['detection_boxes'][0]
        output_dict['detection_scores'] = output_dict['detection_scores'][0]
        return output_dict

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
