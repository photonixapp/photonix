import operator
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
import redis
from redis_lock import Lock

from photonix.classifiers.base_model import BaseModel
from .mtcnn import MTCNN


GRAPH_FILE = os.path.join('face_detection', 'mtcnn_weights.npy')

class FaceDetectionModel(BaseModel):
    name = 'face_detection'
    version = 20210120
    approx_ram_mb = 1000
    max_num_workers = 2

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
        # detector = MTCNN()
        results = self.graph.detect_faces(image)
        return list(filter(lambda f: f['confidence'] > min_score, results))


def run_on_photo(photo_id):
    model = FaceDetectionModel()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from photonix.classifiers.runners import results_for_model_on_photo, get_or_create_tag
    photo, results = results_for_model_on_photo(model, photo_id)

    if photo:
        from django.utils import timezone
        from photonix.photos.models import PhotoTag
        photo.clear_tags(source='C', type='F')
        for result in results:
            tag = get_or_create_tag(library=photo.library, name='Unknown face', type='F', source='C')
            x = (result['box'][0] + (result['box'][2] / 2)) / photo.base_file.width
            y = (result['box'][1] + (result['box'][3] / 2)) / photo.base_file.height
            width = result['box'][2] / photo.base_file.width
            height = result['box'][3] / photo.base_file.height
            score = result['confidence']
            PhotoTag(photo=photo, tag=tag, source='F', confidence=score, significance=score, position_x=x, position_y=y, size_x=width, size_y=height).save()
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
