import datetime as dt
import json
import logging
import os
import sys
from pathlib import Path
from random import randint

import cv2
import numpy as np
from annoy import AnnoyIndex
from PIL import Image, ImageOps
from redis_lock import Lock

from photonix.classifiers.base_model import BaseModel, create_ort_session
from photonix.classifiers.image_utils import downscale_for_inference
from photonix.photos.utils.redis import redis_connection

logger = logging.getLogger(__name__)


# Model files already staged in the models volume: an InsightFace SCRFD-500M
# detector and a MobileFaceNet (w600k_mbf) ArcFace recognizer, both ONNX.
DET_GRAPH_FILE = os.path.join('face', 'det_500m.onnx')
REC_GRAPH_FILE = os.path.join('face', 'w600k_mbf.onnx')

# ArcFace embeddings are 512-D and L2-normalized, so the Euclidean distance
# between two of them lies in [0, 2] and is monotonic with cosine distance.
# Measured on tests/photos/faces/ the same-identity distances top out around
# 1.0 while the closest cross-identity pair sits at 1.31, so 1.1 gives a clear
# margin either side.
EMBEDDING_SIZE = 512
DISTANCE_THRESHOLD = 1.1

# During a model upgrade the previous face tags carry incomparable 128-D
# FaceNet embeddings, so a re-detected face that fails embedding matching is
# re-linked to an old human-named tag when their boxes overlap by more than
# this IoU (normalized coordinates).
TAG_PRESERVE_IOU = 0.4

# SCRFD decode parameters. det_500m emits 9 outputs (score/bbox/kps for each of
# 3 FPN strides) with 2 anchors per location. det_thresh 0.5 and nms 0.4 are
# InsightFace's defaults.
SCRFD_STRIDES = (8, 16, 32)
SCRFD_NUM_ANCHORS = 2
SCRFD_NMS_THRESH = 0.4
SCRFD_INPUT_SIZE = 640
# SCRFD emits its five landmarks in this order.
SCRFD_KEYPOINT_NAMES = ('left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right')

# Canonical 112x112 ArcFace destination landmarks (InsightFace face_align).
ARCFACE_DST = np.array([
    [38.2946, 51.6963],
    [73.5318, 51.5014],
    [56.0252, 71.7366],
    [41.5493, 92.3655],
    [70.7299, 92.2041]], dtype=np.float32)


def find_euclidean_distance(source, target):
    """Euclidean distance between two embeddings (lists or arrays)."""
    source = np.asarray(source, dtype=np.float64)
    target = np.asarray(target, dtype=np.float64)
    return float(np.sqrt(np.sum(np.square(source - target))))


def _umeyama(src, dst):
    """Least-squares similarity transform (Umeyama 1991) mapping ``src`` onto
    ``dst``. Returns the (dim+1)x(dim+1) homogeneous matrix; the top two rows
    are the 2x3 affine used by cv2.warpAffine. Reimplemented here (matching
    skimage's SimilarityTransform) to avoid adding a scikit-image dependency."""
    src = np.asarray(src, dtype=np.float64)
    dst = np.asarray(dst, dtype=np.float64)
    num, dim = src.shape

    src_mean = src.mean(axis=0)
    dst_mean = dst.mean(axis=0)
    src_demean = src - src_mean
    dst_demean = dst - dst_mean

    A = dst_demean.T @ src_demean / num
    d = np.ones((dim,), dtype=np.float64)
    if np.linalg.det(A) < 0:
        d[dim - 1] = -1

    T = np.eye(dim + 1, dtype=np.float64)
    U, S, V = np.linalg.svd(A)
    rank = np.linalg.matrix_rank(A)
    if rank == 0:
        return T * np.nan
    elif rank == dim - 1:
        if np.linalg.det(U) * np.linalg.det(V) > 0:
            T[:dim, :dim] = U @ V
        else:
            s = d[dim - 1]
            d[dim - 1] = -1
            T[:dim, :dim] = U @ np.diag(d) @ V
            d[dim - 1] = s
    else:
        T[:dim, :dim] = U @ np.diag(d) @ V

    scale = 1.0 / src_demean.var(axis=0).sum() * (S @ d)
    T[:dim, dim] = dst_mean - scale * (T[:dim, :dim] @ src_mean.T)
    T[:dim, :dim] *= scale
    return T


# --- SCRFD decode helpers (adapted from InsightFace's scrfd.py, MIT-licensed:
#     https://github.com/deepinsight/insightface, detection/scrfd) ---

def _distance2bbox(points, distance):
    x1 = points[:, 0] - distance[:, 0]
    y1 = points[:, 1] - distance[:, 1]
    x2 = points[:, 0] + distance[:, 2]
    y2 = points[:, 1] + distance[:, 3]
    return np.stack([x1, y1, x2, y2], axis=-1)


def _distance2kps(points, distance):
    preds = []
    for i in range(0, distance.shape[1], 2):
        px = points[:, i % 2] + distance[:, i]
        py = points[:, i % 2 + 1] + distance[:, i + 1]
        preds.append(px)
        preds.append(py)
    return np.stack(preds, axis=-1)


def _nms(dets, thresh):
    x1, y1, x2, y2, scores = dets[:, 0], dets[:, 1], dets[:, 2], dets[:, 3], dets[:, 4]
    areas = (x2 - x1 + 1) * (y2 - y1 + 1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1 + 1)
        h = np.maximum(0.0, yy2 - yy1 + 1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter)
        order = order[np.where(ovr <= thresh)[0] + 1]
    return keep


def _iou_normalized(a, b):
    """IoU of two boxes given as (center_x, center_y, width, height) in
    normalized [0, 1] coordinates."""
    ax1, ay1 = a[0] - a[2] / 2, a[1] - a[3] / 2
    ax2, ay2 = a[0] + a[2] / 2, a[1] + a[3] / 2
    bx1, by1 = b[0] - b[2] / 2, b[1] - b[3] / 2
    bx2, by2 = b[0] + b[2] / 2, b[1] + b[3] / 2
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


class FaceModel(BaseModel):
    name = 'face'
    version = 20260719
    retrained_version = 0
    library_id = None
    approx_ram_mb = 200
    max_num_workers = 1

    def __init__(self, model_dir=None, det_graph_file=DET_GRAPH_FILE,
                 rec_graph_file=REC_GRAPH_FILE, library_id=None, lock_name=None):
        super().__init__(model_dir=model_dir)
        self.library_id = library_id

        self._det_graph_file = os.path.join(self.model_dir, det_graph_file)
        self._rec_graph_file = os.path.join(self.model_dir, rec_graph_file)
        self._lock_name = lock_name
        self.graph = None
        self._det_input_name = None
        self._det_output_names = None
        self._rec_input_name = None

        # Download model files eagerly (cheap), but don't load into memory yet
        self.ensure_downloaded(lock_name=lock_name)

    def load(self):
        # Reuse the SCRFD detector and ArcFace recognizer ONNX Runtime sessions
        # across photos (and across re-instantiated models in this process),
        # mirroring the old mtcnn/facenet graph-cache key pattern.
        det_key = f'{self.graph_cache_key}:det'
        rec_key = f'{self.graph_cache_key}:rec'
        with self.load_lock():
            if det_key in self.graph_cache:
                det_session = self.graph_cache[det_key]
            else:
                det_session = create_ort_session(self._det_graph_file)
                self.graph_cache[det_key] = det_session

            if rec_key in self.graph_cache:
                rec_session = self.graph_cache[rec_key]
            else:
                rec_session = create_ort_session(self._rec_graph_file)
                self.graph_cache[rec_key] = rec_session

            # Store version number of retrained model (ANN) if it has been computed
            self.reload_retrained_model_version()

        self.graph = {'det': det_session, 'rec': rec_session}
        self._det_input_name = det_session.get_inputs()[0].name
        self._det_output_names = [o.name for o in det_session.get_outputs()]
        self._rec_input_name = rec_session.get_inputs()[0].name

    # 0.5 is InsightFace's det_thresh default, but at that level SCRFD fires
    # on dog faces (0.53-0.65 on the bench set), which would surface as bogus
    # "Unknown person" tags on pet photos. 0.7 matches Immich's production
    # default for the same detector and keeps every planted human face in the
    # bench collage (all score >= 0.745) with zero animal false positives.
    def predict(self, image_file, min_score=0.7, photo_file=None):
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
            image = ImageOps.exif_transpose(image)

        # Cap inference resolution, but keep the full-res dimensions so detected
        # boxes/keypoints can be mapped back into original pixel space -
        # run_on_photo() aligns faces from the full-res image.
        orig_width, orig_height = image.size
        image, scale = downscale_for_inference(image)

        img_np = np.asarray(image)  # RGB, HxWx3, uint8
        detections = self._detect_faces(img_np, min_score)

        results = []
        for det in detections:
            box = self._scale_box(det['box'], scale, orig_width, orig_height)
            keypoints = {}
            for name, (kx, ky) in det['keypoints'].items():
                x = min(max(int(round(kx * scale)), 0), orig_width - 1)
                y = min(max(int(round(ky * scale)), 0), orig_height - 1)
                keypoints[name] = (x, y)
            results.append({
                'box': box,
                'confidence': det['confidence'],
                'keypoints': keypoints,
            })
        return results

    def _detect_faces(self, img_rgb, min_score):
        """Run SCRFD on an RGB numpy image, returning a list of
        {'box': [x, y, w, h], 'confidence': float, 'keypoints': {name: (x, y)}}
        with coordinates in ``img_rgb`` pixel space."""
        im_h, im_w = img_rgb.shape[:2]

        # Aspect-preserving resize into the top-left of a square letterbox, so
        # the pretrained anchors see faces at their trained scale (InsightFace's
        # SCRFD.detect()).
        im_ratio = float(im_h) / float(im_w)
        if im_ratio > 1:
            new_height = SCRFD_INPUT_SIZE
            new_width = int(SCRFD_INPUT_SIZE / im_ratio)
        else:
            new_width = SCRFD_INPUT_SIZE
            new_height = int(SCRFD_INPUT_SIZE * im_ratio)
        det_scale = float(new_height) / im_h
        resized = cv2.resize(img_rgb, (new_width, new_height))
        det_img = np.zeros((SCRFD_INPUT_SIZE, SCRFD_INPUT_SIZE, 3), dtype=np.uint8)
        det_img[:new_height, :new_width, :] = resized

        # blob = (pixel - 127.5) / 128, NCHW. InsightFace feeds BGR frames with
        # swapRB=True, so the network sees RGB - which is exactly what PIL hands
        # us, so no channel swap is needed.
        blob = ((det_img.astype(np.float32) - 127.5) / 128.0).transpose(2, 0, 1)[np.newaxis]

        outputs = self.graph['det'].run(self._det_output_names, {self._det_input_name: blob})

        # The 9 outputs are score(1)/bbox(4)/kps(10) feature maps for 3 strides.
        # Group them by trailing dim and order each group by anchor count
        # descending, which orders them by stride 8, 16, 32.
        score_maps = sorted((o for o in outputs if o.shape[1] == 1), key=lambda a: -a.shape[0])
        bbox_maps = sorted((o for o in outputs if o.shape[1] == 4), key=lambda a: -a.shape[0])
        kps_maps = sorted((o for o in outputs if o.shape[1] == 10), key=lambda a: -a.shape[0])

        scores_list, bboxes_list, kpss_list = [], [], []
        for idx, stride in enumerate(SCRFD_STRIDES):
            scores = score_maps[idx]
            bbox_preds = bbox_maps[idx] * stride
            kps_preds = kps_maps[idx] * stride

            height = SCRFD_INPUT_SIZE // stride
            width = SCRFD_INPUT_SIZE // stride
            anchor_centers = np.stack(np.mgrid[:height, :width][::-1], axis=-1).astype(np.float32)
            anchor_centers = (anchor_centers * stride).reshape((-1, 2))
            if SCRFD_NUM_ANCHORS > 1:
                anchor_centers = np.stack(
                    [anchor_centers] * SCRFD_NUM_ANCHORS, axis=1).reshape((-1, 2))

            pos_inds = np.where(scores.ravel() >= min_score)[0]
            bboxes = _distance2bbox(anchor_centers, bbox_preds)
            kpss = _distance2kps(anchor_centers, kps_preds).reshape((bbox_preds.shape[0], -1, 2))
            scores_list.append(scores[pos_inds])
            bboxes_list.append(bboxes[pos_inds])
            kpss_list.append(kpss[pos_inds])

        scores = np.vstack(scores_list)
        if scores.shape[0] == 0:
            return []

        order = scores.ravel().argsort()[::-1]
        bboxes = np.vstack(bboxes_list) / det_scale
        kpss = np.vstack(kpss_list) / det_scale
        pre_det = np.hstack((bboxes, scores)).astype(np.float32)[order]
        keep = _nms(pre_det, SCRFD_NMS_THRESH)
        det = pre_det[keep]
        kpss = kpss[order][keep]

        results = []
        for i in range(det.shape[0]):
            x1, y1, x2, y2, score = det[i]
            box = [float(x1), float(y1), float(x2 - x1), float(y2 - y1)]
            keypoints = {
                name: (float(kpss[i][j][0]), float(kpss[i][j][1]))
                for j, name in enumerate(SCRFD_KEYPOINT_NAMES)
            }
            results.append({'box': box, 'confidence': float(score), 'keypoints': keypoints})
        return results

    @staticmethod
    def _scale_box(box, scale, image_width, image_height):
        # Map a [x, y, w, h] box from downscaled space back into full-res pixel
        # space, rounding to int and clamping within the image bounds.
        x = min(max(int(round(box[0] * scale)), 0), image_width - 1)
        y = min(max(int(round(box[1] * scale)), 0), image_height - 1)
        w = min(int(round(box[2] * scale)), image_width - x)
        h = min(int(round(box[3] * scale)), image_height - y)
        return [x, y, w, h]

    def crop(self, image_data, box):
        # Calculate crop coordinates with 30% padding, clipped to image boundaries
        x1 = max(box[0] - int(box[2] * 0.3), 0)
        y1 = max(box[1] - int(box[3] * 0.3), 0)
        x2 = min(box[0] + box[2] + int(box[2] * 0.3), image_data.width)
        y2 = min(box[1] + box[3] + int(box[3] * 0.3), image_data.height)

        # Ensure valid crop region (x2 > x1 and y2 > y1)
        x1 = min(x1, image_data.width - 1)
        y1 = min(y1, image_data.height - 1)
        x2 = max(x2, x1 + 1)
        y2 = max(y2, y1 + 1)

        return image_data.crop([x1, y1, x2, y2])

    def _estimate_norm(self, landmarks):
        """2x3 affine warping the 5 detected landmarks onto the canonical
        112x112 ArcFace destination points."""
        landmarks = np.asarray(landmarks, dtype=np.float32)
        T = _umeyama(landmarks, ARCFACE_DST)
        return T[0:2, :].astype(np.float32)

    def get_face_embedding(self, image_data, keypoints=None):
        self._ensure_loaded()  # Ensure model is loaded for embedding generation

        if isinstance(image_data, Image.Image):
            if image_data.mode != 'RGB':
                image_data = image_data.convert('RGB')
            img = np.asarray(image_data)
        else:
            img = np.asarray(image_data)
            if img.ndim == 2:
                img = np.stack([img] * 3, axis=-1)

        if keypoints is not None:
            # Proper ArcFace alignment: similarity transform onto the canonical
            # landmarks then warp the (full-res) image to a 112x112 face chip.
            landmarks = np.array([keypoints[name] for name in SCRFD_KEYPOINT_NAMES],
                                 dtype=np.float32)
            M = self._estimate_norm(landmarks)
            aligned = cv2.warpAffine(img, M, (112, 112), borderValue=0.0)
        else:
            # Fallback for legacy callers that pass a bare face crop with no
            # landmarks: a plain resize skips alignment, so embeddings are less
            # accurate (rotation/scale of the face is not normalized).
            aligned = cv2.resize(img, (112, 112))

        # blob = (pixel - 127.5) / 127.5, NCHW, RGB channel order (matches
        # InsightFace's ArcFaceONNX preprocessing with swapRB=True on BGR).
        blob = ((aligned.astype(np.float32) - 127.5) / 127.5).transpose(2, 0, 1)[np.newaxis]
        embedding = self.graph['rec'].run(None, {self._rec_input_name: blob})[0][0]

        # L2-normalize so Euclidean distance is bounded and comparable via Annoy.
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding.tolist()

    def find_closest_face_tag_by_ann(self, source_embedding):
        # Use ANN index to do quick search if it has been trained by retrain_face_similarity_index
        from django.conf import settings
        ann_path = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_faces.ann'
        tag_ids_path = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_faces_tag_ids.json'

        if os.path.exists(ann_path) and os.path.exists(tag_ids_path):
            t = AnnoyIndex(EMBEDDING_SIZE, 'euclidean')
            # Ensure ANN index, tag IDs and version files can't be updated while we are reading
            with Lock(redis_connection, 'face_model_retrain', expire=60, auto_renewal=True):
                self.reload_retrained_model_version()
                try:
                    t.load(str(ann_path))
                except (OSError, IOError, RuntimeError) as e:
                    # A stale index from the old 128-D FaceNet model can't be
                    # read at 512-D; treat it as absent - the periodic retrain
                    # command rewrites it in the new format.
                    logger.warning(f'Ignoring incompatible face ANN index at {ann_path}: {e}')
                    return (None, 999)
                with open(tag_ids_path) as f:
                    tag_ids = json.loads(f.read())
            nearest = t.get_nns_by_vector(source_embedding, 1, include_distances=True)
            if nearest[0]:
                return tag_ids[nearest[0][0]], nearest[1][0]

        return (None, 999)

    def find_closest_face_tag_by_brute_force(self, source_embedding, oldest_date=None, target_data=None):
        if not self.library_id and not target_data:
            raise ValueError('No Library ID is set')

        representations = []
        if target_data:  # Mainly as an option for testing
            for id, embedding in target_data:
                representations.append((id, embedding))
        else:
            # Collect all previously generated embeddings
            from photonix.photos.models import PhotoTag
            photo_tags = PhotoTag.objects.filter(photo__library_id=self.library_id, tag__type='F')
            if oldest_date:
                photo_tags = photo_tags.filter(created_at__gt=oldest_date)
            for photo_tag in photo_tags:
                try:
                    # Only read new-format 512-D ArcFace embeddings. Old
                    # 'facenet_embedding' entries are 128-D and incomparable, so
                    # they lack this key and are skipped silently.
                    tag_embedding = json.loads(photo_tag.extra_data)['face_embedding']
                    representations.append((str(photo_tag.tag.id), tag_embedding))
                except (KeyError, TypeError, json.decoder.JSONDecodeError):
                    pass

        # Calculate Euclidean distances
        distances = []
        for (_, target_embedding) in representations:
            distance = find_euclidean_distance(source_embedding, target_embedding)
            distances.append(distance)

        # Return closest match and distance value
        if not distances:  # First face added has nothing to compare to
            return (None, 999)
        index = np.argmin(distances)
        return (representations[index][0], distances[index])

    def find_closest_face_tag(self, source_embedding):
        if not self.library_id:
            raise ValueError('No Library ID is set')

        ann_nearest, ann_distance = self.find_closest_face_tag_by_ann(source_embedding)

        oldest_date = None
        if self.retrained_version:
            oldest_date = dt.datetime.strptime(str(self.retrained_version), '%Y%m%d%H%M%S').replace(tzinfo=dt.timezone.utc)

        brute_force_nearest, brute_force_distance = self.find_closest_face_tag_by_brute_force(source_embedding, oldest_date=oldest_date)

        if ann_nearest and ann_distance < brute_force_distance:
            return ann_nearest, ann_distance
        else:
            return brute_force_nearest, brute_force_distance

    def retrain_face_similarity_index(self, training_data=None):
        if not self.library_id and not training_data:
            raise ValueError('No Library ID is set')

        from django.conf import settings
        from photonix.photos.models import PhotoTag
        ann_path = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_faces.ann'
        tag_ids_path = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_faces_tag_ids.json'
        version_file = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_retrained_version.txt'

        t = AnnoyIndex(EMBEDDING_SIZE, 'euclidean')
        retrained_version = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d%H%M%S')

        tag_ids = []
        if training_data:  # Mainly as an option for testing
            for id, embedding in training_data:
                t.add_item(len(tag_ids), embedding)
                tag_ids.append(id)
        else:
            # Only train on this library's faces - the index is saved
            # per-library so mixing in other libraries' embeddings causes
            # wrong matches and leaks faces across libraries
            for photo_tag in PhotoTag.objects.filter(photo__library_id=self.library_id, tag__type='F').order_by('id'):
                try:
                    extra_data = json.loads(photo_tag.extra_data)
                    # Skip old-format 128-D FaceNet embeddings (no 'face_embedding' key)
                    embedding = extra_data['face_embedding']
                    t.add_item(len(tag_ids), embedding)
                    tag_ids.append(str(photo_tag.tag.id))
                except (json.decoder.JSONDecodeError, KeyError, TypeError):
                    pass

        # Build the ANN index
        t.build(3)  # Number of random forest trees

        # Aquire lock to save ANN, tag IDs and version files atomically.
        # Each file is written to a temp path and renamed into place so a
        # reader that already has the previous index mmap'd keeps a valid
        # (old) inode instead of having the file truncated under it.
        with Lock(redis_connection, 'face_model_retrain', expire=60, auto_renewal=True):
            # Save ANN index
            t.save(str(ann_path) + '.tmp')
            os.replace(str(ann_path) + '.tmp', ann_path)

            # Save Tag IDs to JSON file as Annoy only supports integer IDs so we have to do the mapping ourselves
            with open(str(tag_ids_path) + '.tmp', 'w') as f:
                f.write(json.dumps(tag_ids))
            os.replace(str(tag_ids_path) + '.tmp', tag_ids_path)

            # Save version of retrained model to text file - used to save against on PhotoTag model and to determine whether retraining is required
            with open(str(version_file) + '.tmp', 'w') as f:
                f.write(retrained_version)
            os.replace(str(version_file) + '.tmp', version_file)

    def reload_retrained_model_version(self):
        if self.library_id:
            from django.conf import settings
            version_file = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_retrained_version.txt'
            version_date = None
            if os.path.exists(version_file):
                with open(version_file) as f:
                    contents = f.read().strip()
                    version_date = dt.datetime.strptime(contents, '%Y%m%d%H%M%S').replace(tzinfo=dt.timezone.utc)
                    self.retrained_version = int(version_date.strftime('%Y%m%d%H%M%S'))
                    return self.retrained_version
        return 0


def run_on_photo(photo_id):
    from photonix.classifiers.model_manager import get_model_manager

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from photonix.classifiers.runners import get_photo_by_any_type, results_for_model_on_photo, get_or_create_tag

    photo = get_photo_by_any_type(photo_id)

    # Get or lazily load the model via ModelManager
    # Face model needs library_id for face matching
    model = get_model_manager().get_model(
        'face',
        FaceModel,
        library_id=photo and photo.library_id
    )

    # Detect all faces in an image
    photo, results = results_for_model_on_photo(model, photo_id)

    # Read image data so we can align faces and create embeddings
    path = photo_id
    if photo:
        path = photo.base_image_path
        model.library_id = photo.library_id
    image_data = Image.open(path)

    # Apply the same rotation predict() used so that the detected bounding
    # boxes and keypoints line up with the bitmap we align faces from
    if photo:
        from photonix.photos.utils.rotation import apply_photo_rotation
        image_data = apply_photo_rotation(image_data, photo.base_file)
    else:
        image_data = ImageOps.exif_transpose(image_data)

    if image_data.mode != 'RGB':
        image_data = image_data.convert('RGB')
    image_np = np.asarray(image_data)

    # Loop over each face that was detected above
    for result in results:
        keypoints = result.get('keypoints')
        try:
            if keypoints:
                # Proper ArcFace alignment from the full-res image using the
                # detected landmarks.
                embedding = model.get_face_embedding(image_np, keypoints=keypoints)
            else:
                # No landmarks (shouldn't happen for SCRFD): fall back to a
                # padded crop resized to 112x112.
                face_image = model.crop(image_data, result['box'])
                embedding = model.get_face_embedding(face_image)
            # Add it to the results
            result['embedding'] = embedding
            if photo:
                closest_tag, closest_distance = model.find_closest_face_tag(embedding)
                if closest_tag:
                    result['closest_tag'] = closest_tag
                    result['closest_distance'] = closest_distance
        except ValueError:
            pass

    if photo:
        from photonix.photos.models import Tag, PhotoTag

        # Snapshot existing face tags (name + box + verified) before clearing.
        # Re-analysis under a new model produces fresh embeddings that can't be
        # matched against the old 128-D ones, so without this a human-assigned
        # name would be replaced by "Unknown person". We re-link by box overlap.
        old_face_tags = []
        for pt in photo.photo_tags.filter(tag__type='F').select_related('tag'):
            if pt.position_x is None or pt.size_x is None:
                continue
            old_face_tags.append({
                'tag_id': pt.tag_id,
                'box': (pt.position_x, pt.position_y, pt.size_x, pt.size_y),
                'verified': pt.verified,
            })

        photo.clear_tags(source='C', type='F')
        used_old = set()
        for result in results:
            # Normalize positions by the rotated image's dimensions - the boxes
            # are relative to the displayed orientation.
            x = (result['box'][0] + (result['box'][2] / 2)) / image_data.width
            y = (result['box'][1] + (result['box'][3] / 2)) / image_data.height
            width = result['box'][2] / image_data.width
            height = result['box'][3] / image_data.height
            score = result['confidence']
            verified = False

            # Use matched tag if within distance threshold
            if result.get('closest_distance', 999) < DISTANCE_THRESHOLD:
                tag = Tag.objects.get(id=result['closest_tag'], library=photo.library, type='F')

            else:
                # No embedding match: try to preserve a previously named face by
                # box overlap so migrations don't lose human-assigned names.
                best_idx, best_iou = None, TAG_PRESERVE_IOU
                new_box = (x, y, width, height)
                for i, old in enumerate(old_face_tags):
                    if i in used_old:
                        continue
                    iou = _iou_normalized(new_box, old['box'])
                    if iou > best_iou:
                        best_idx, best_iou = i, iou

                if best_idx is not None:
                    used_old.add(best_idx)
                    old = old_face_tags[best_idx]
                    tag = Tag.objects.get(id=old['tag_id'], library=photo.library, type='F')
                    verified = old['verified']

                # Otherwise create new tag
                else:
                    while True:
                        random_name = f'Unknown person {randint(0, 999999):06d}'
                        try:
                            Tag.objects.get(library=photo.library, name=random_name, type='F', source='C')
                        except Tag.DoesNotExist:
                            tag = Tag(library=photo.library, name=random_name, type='F', source='C')
                            tag.save()
                            break

            extra_data = ''
            if 'embedding' in result:
                extra_data = json.dumps({'face_embedding': result['embedding']})

            PhotoTag(photo=photo, tag=tag, source='F', confidence=score, significance=score, position_x=x, position_y=y, size_x=width, size_y=height, model_version=model.version, retrained_model_version=model.retrained_version, verified=verified, extra_data=extra_data).save()

    return photo, results


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Argument required: image file path or Photo ID')
        exit(1)

    _, results = run_on_photo(sys.argv[1])
    print(results)
