import json
import operator
import os
import sys
from pathlib import Path
from random import randint

from deepface import DeepFace
import numpy as np
from PIL import Image
import redis
from redis_lock import Lock

from photonix.classifiers.base_model import BaseModel
from photonix.classifiers.face_detection.mtcnn import MTCNN
from photonix.photos.models import Tag, PhotoTag


GRAPH_FILE = os.path.join('face_detection', 'mtcnn_weights.npy')

class FaceDetectionModel(BaseModel):
    name = 'face_detection'
    version = 20210120
    approx_ram_mb = 1000
    max_num_workers = 1

    def __init__(self, model_dir=None, graph_file=GRAPH_FILE, lock_name=None):
        super().__init__(model_dir=model_dir)

        graph_file = os.path.join(self.model_dir, graph_file)

        if self.ensure_downloaded(lock_name=lock_name):
            self.graph = self.load_graph(graph_file)

    def load_graph(self, graph_file):
        r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))
        with Lock(r, 'classifier_{}_load_graph'.format(self.name)):
            if self.graph_cache_key in self.graph_cache:
                return self.graph_cache[self.graph_cache_key]

            graph = MTCNN(weights_file=graph_file)

            self.graph_cache[self.graph_cache_key] = graph
            return graph

    def predict(self, image_file, min_score=0.99):
        image = Image.open(image_file)
        image = np.asarray(image)
        results = self.graph.detect_faces(image)
        return list(filter(lambda f: f['confidence'] > min_score, results))


def calculate_euclidian_distance(source_representation, test_representation):
    euclidean_distance = np.array(source_representation) - np.array(test_representation)
    euclidean_distance = np.sum(np.multiply(euclidean_distance, euclidean_distance))
    euclidean_distance = np.sqrt(euclidean_distance)
    return euclidean_distance


def find_closest_face_tag(library_id, source_embedding):
    # Collect all previously generated embeddings
    representations = []
    for photo_tag in PhotoTag.objects.filter(photo__library_id=library_id, tag__type='F'):
        try:
            tag_embedding = json.loads(photo_tag.extra_data)['facenet_embedding']
            representations.append((str(photo_tag.tag.id), tag_embedding))
        except (KeyError, json.decoder.JSONDecodeError):
            pass

    # Calculate Euclidean distances
    distances = []
    for (_, target_embedding) in representations:
        distance = calculate_euclidian_distance(source_embedding, target_embedding)
        distances.append(distance)

    # Return closest match and distance value
    if not distances:  # First face has nothing to compare to
        return (None, 999)
    candidate_idx = np.argmin(distances)
    return (representations[candidate_idx][0], distance)


def run_on_photo(photo_id):
    model = FaceDetectionModel()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from photonix.classifiers.runners import results_for_model_on_photo, get_or_create_tag
    # Detect all faces in an image
    photo, results = results_for_model_on_photo(model, photo_id)

    # Read image data so we can extract faces and create embeddings
    path = photo_id
    if photo:
        path = photo.base_image_path
    image_data = Image.open(path)

    # Loop over each face that was detected above
    for result in results:
        # Crop individual face + 30% extra in each direction
        box = result['box']
        face_image = image_data.crop([box[0]-int(box[2]*0.3), box[1]-int(box[3]*0.3), box[0]+box[2]+int(box[2]*0.3), box[1]+box[3]+int(box[3]*0.3)])
        # Generate embedding with Facenet
        try:
            embedding = DeepFace.represent(np.asarray(face_image), model_name='Facenet')
            # Add it to the results
            result['embedding'] = embedding
            if photo:
                closest_tag, closest_distance = find_closest_face_tag(photo.library, embedding)
                if closest_tag:
                    print(f'Closest tag: {closest_tag}')
                    print(f'Closest distance: {closest_distance}')
                    result['closest_tag'] = closest_tag
                    result['closest_distance'] = closest_distance
        except ValueError:
            pass

    if photo:
        from django.utils import timezone
        from photonix.photos.models import PhotoTag
        photo.clear_tags(source='C', type='F')
        for result in results:
            if result.get('closest_distance', 999) < 14:
                tag = Tag.objects.get(id=result['closest_tag'], library=photo.library, type='F')
                print(f'MATCHED {tag.name}')
            else:
                tag = get_or_create_tag(library=photo.library, name=f'Unknown face {randint(1,1000000)}', type='F', source='C')
            x = (result['box'][0] + (result['box'][2] / 2)) / photo.base_file.width
            y = (result['box'][1] + (result['box'][3] / 2)) / photo.base_file.height
            width = result['box'][2] / photo.base_file.width
            height = result['box'][3] / photo.base_file.height
            score = result['confidence']

            extra_data = ''
            if 'embedding' in result:
                extra_data = json.dumps({'facenet_embedding': result['embedding']})

            PhotoTag(photo=photo, tag=tag, source='F', confidence=score, significance=score, position_x=x, position_y=y, size_x=width, size_y=height, extra_data=extra_data).save()
        photo.classifier_color_completed_at = timezone.now()
        photo.classifier_color_version = getattr(model, 'version', 0)
        photo.save()

    print('Finished')

    return photo, results


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Argument required: image file path or Photo ID')
        exit(1)

    _, results = run_on_photo(sys.argv[1])
    print(results)
