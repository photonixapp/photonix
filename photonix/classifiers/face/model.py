from datetime import datetime
import json
import logging
import os
import sys
from pathlib import Path
from random import randint

from annoy import AnnoyIndex

logger = logging.getLogger(__name__)
from django.utils import timezone
import numpy as np
from PIL import Image, ImageOps
from redis_lock import Lock

from photonix.classifiers.base_model import BaseModel
from photonix.photos.utils.redis import redis_connection

# Lazy-loaded modules (heavy imports - TensorFlow/Keras based)
_DeepFace = None
_MTCNN = None
_findEuclideanDistance = None
_build_model = None


def _ensure_face_libs():
    """Lazy load face recognition libraries (imports TensorFlow/Keras)."""
    global _DeepFace, _MTCNN, _findEuclideanDistance, _build_model
    if _MTCNN is None:
        from photonix.classifiers.face.deepface import DeepFace as df
        from photonix.classifiers.face.mtcnn import MTCNN as mtcnn
        from photonix.classifiers.face.deepface.commons.distance import findEuclideanDistance as fed
        from photonix.classifiers.face.deepface.DeepFace import build_model as bm
        _DeepFace = df
        _MTCNN = mtcnn
        _findEuclideanDistance = fed
        _build_model = bm
    return _DeepFace, _MTCNN, _findEuclideanDistance, _build_model


GRAPH_FILE = os.path.join('face', 'mtcnn_weights.npy')
DISTANCE_THRESHOLD = 10


class FaceModel(BaseModel):
    name = 'face'
    version = 20210528
    retrained_version = 0
    library_id = None
    approx_ram_mb = 600
    max_num_workers = 1

    def __init__(self, model_dir=None, graph_file=GRAPH_FILE, library_id=None, lock_name=None):
        super().__init__(model_dir=model_dir)
        self.library_id = library_id

        self._graph_file = os.path.join(self.model_dir, graph_file)
        self._lock_name = lock_name
        self._loaded = False
        self.graph = None

        # Download model files eagerly (cheap), but don't load into memory yet
        self.ensure_downloaded(lock_name=lock_name)

    def _ensure_loaded(self):
        """Lazy load the model on first use."""
        if self._loaded:
            return

        self.graph = self.load_graph(self._graph_file)
        self._loaded = True

    def load_graph(self, graph_file):
        DeepFace, MTCNN, findEuclideanDistance, build_model = _ensure_face_libs()
        with Lock(redis_connection, 'classifier_{}_load_graph'.format(self.name)):
            # Load MTCNN
            mtcnn_graph = None
            mtcnn_key = '{self.graph_cache_key}:mtcnn'
            if mtcnn_key in self.graph_cache:
                mtcnn_graph = self.graph_cache[mtcnn_key]
            else:
                mtcnn_graph = MTCNN(weights_file=graph_file)
                self.graph_cache[mtcnn_key] = mtcnn_graph

            # Load Facenet
            facenet_graph = None
            facenet_key = '{self.graph_cache_key}:facenet'
            if facenet_key in self.graph_cache:
                facenet_graph = self.graph_cache[facenet_key]
            else:
                facenet_graph = build_model('Facenet')
                self.graph_cache[facenet_key] = facenet_graph

            # Store version number of retrained model (ANN) if it has been computed
            self.reload_retrained_model_version()

            return {
                'mtcnn': mtcnn_graph,
                'facenet': facenet_graph,
            }

    def predict(self, image_file, min_score=0.99, photo_file=None):
        self._ensure_loaded()  # Lazy load on first use

        # Detects face bounding boxes
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

        image = np.asarray(image)
        results = self.graph['mtcnn'].detect_faces(image)
        return list(filter(lambda f: f['confidence'] > min_score, results))

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

    def get_face_embedding(self, image_data):
        self._ensure_loaded()  # Ensure model is loaded for embedding generation
        DeepFace, _, _, _ = _ensure_face_libs()
        return DeepFace.represent(np.asarray(image_data), model_name='Facenet', model= self.graph['facenet'])

    def find_closest_face_tag_by_ann(self, source_embedding):
        # Use ANN index to do quick serach if it has been trained by retrain_face_similarity_index
        from django.conf import settings
        ann_path = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_faces.ann'
        tag_ids_path = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_faces_tag_ids.json'

        if os.path.exists(ann_path) and os.path.exists(tag_ids_path):
            embedding_size = 128  # FaceNet output size
            t = AnnoyIndex(embedding_size, 'euclidean')
            # Ensure ANN index, tag IDs and version files can't be updated while we are reading
            with Lock(redis_connection, 'face_model_retrain'):
                self.reload_retrained_model_version()
                t.load(str(ann_path))
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
                    tag_embedding = json.loads(photo_tag.extra_data)['facenet_embedding']
                    representations.append((str(photo_tag.tag.id), tag_embedding))
                except (KeyError, json.decoder.JSONDecodeError):
                    pass

        # Calculate Euclidean distances
        _, _, findEuclideanDistance, _ = _ensure_face_libs()
        distances = []
        for (_, target_embedding) in representations:
            distance = findEuclideanDistance(source_embedding, target_embedding)
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
            oldest_date = datetime.strptime(str(self.retrained_version), '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)

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

        embedding_size = 128  # FaceNet output size
        t = AnnoyIndex(embedding_size, 'euclidean')
        retrained_version = datetime.utcnow().strftime('%Y%m%d%H%M%S')

        tag_ids = []
        if training_data:  # Mainly as an option for testing
            for id, embedding in training_data:
                t.add_item(len(tag_ids), embedding)
                tag_ids.append(id)
        else:
            for photo_tag in PhotoTag.objects.filter(tag__type='F').order_by('id'):
                try:
                    extra_data = json.loads(photo_tag.extra_data)
                    embedding = extra_data['facenet_embedding']
                    t.add_item(len(tag_ids), embedding)
                    tag_ids.append(str(photo_tag.tag.id))
                except (json.decoder.JSONDecodeError, KeyError, TypeError):
                    pass

        # Build the ANN index
        t.build(3)  # Number of random forest trees

        # Aquire lock to save ANN, tag IDs and version files atomically
        with Lock(redis_connection, 'face_model_retrain'):
            # Save ANN index
            t.save(str(ann_path))

            # Save Tag IDs to JSON file as Annoy only supports integer IDs so we have to do the mapping ourselves
            with open(tag_ids_path, 'w') as f:
                f.write(json.dumps(tag_ids))

            # Save version of retrained model to text file - used to save against on PhotoTag model and to determine whether retraining is required
            with open(version_file, 'w') as f:
                f.write(retrained_version)

    def reload_retrained_model_version(self):
        if self.library_id:
            from django.conf import settings
            version_file = Path(settings.MODEL_DIR) / 'face' / f'{self.library_id}_retrained_version.txt'
            version_date = None
            if os.path.exists(version_file):
                with open(version_file) as f:
                    contents = f.read().strip()
                    version_date = datetime.strptime(contents, '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)
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

    # Read image data so we can extract faces and create embeddings
    path = photo_id
    if photo:
        path = photo.base_image_path
        model.library_id = photo.library_id
    image_data = Image.open(path)

    # Loop over each face that was detected above
    for result in results:
        # Crop individual face + 30% extra in each direction
        box = result['box']
        face_image = model.crop(image_data, box)
        # Generate embedding with Facenet
        try:
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
        from django.utils import timezone
        from photonix.photos.models import Tag, PhotoTag

        photo.clear_tags(source='C', type='F')
        for result in results:
            # Use matched tag if within distance threshold
            if result.get('closest_distance', 999) < DISTANCE_THRESHOLD:
                tag = Tag.objects.get(id=result['closest_tag'], library=photo.library, type='F')

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

            x = (result['box'][0] + (result['box'][2] / 2)) / photo.base_file.width
            y = (result['box'][1] + (result['box'][3] / 2)) / photo.base_file.height
            width = result['box'][2] / photo.base_file.width
            height = result['box'][3] / photo.base_file.height
            score = result['confidence']

            extra_data = ''
            if 'embedding' in result:
                extra_data = json.dumps({'facenet_embedding': result['embedding']})

            PhotoTag(photo=photo, tag=tag, source='F', confidence=score, significance=score, position_x=x, position_y=y, size_x=width, size_y=height, model_version=model.version, retrained_model_version=model.retrained_version, extra_data=extra_data).save()
        photo.classifier_color_completed_at = timezone.now()
        photo.classifier_color_version = getattr(model, 'version', 0)
        photo.save()

    return photo, results


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Argument required: image file path or Photo ID')
        exit(1)

    _, results = run_on_photo(sys.argv[1])
    print(results)
