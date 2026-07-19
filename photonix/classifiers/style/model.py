import os
import sys

import numpy as np
from PIL import Image

from photonix.classifiers.base_model import BaseModel, create_ort_session
from photonix.web.utils import logger


GRAPH_FILE = os.path.join('style', 'style.onnx')
LABEL_FILE = os.path.join('style', 'labels.txt')


class StyleModel(BaseModel):
    name = 'style'
    version = 20260719
    approx_ram_mb = 100
    max_num_workers = 2

    def __init__(self, model_dir=None, graph_file=GRAPH_FILE, label_file=LABEL_FILE, lock_name=None):
        super().__init__(model_dir=model_dir)

        self._graph_file = os.path.join(self.model_dir, graph_file)
        self._label_file = os.path.join(self.model_dir, label_file)
        self._lock_name = lock_name
        self.labels = None
        self.session = None
        self.input_name = None

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
        self.input_name = self.session.get_inputs()[0].name

    def load_labels(self, label_file):
        with open(label_file) as f:
            return [line.rstrip() for line in f]

    def predict(self, image_file, min_score=0.66, photo_file=None):
        self._ensure_loaded()  # Lazy load on first use

        t = self.read_tensor_from_image_file(image_file)
        if t is None:
            logger.info(f'Skipping {image_file}, file could not be decoded')
            return None

        results = self.session.run(None, {self.input_name: t})[0]
        results = np.squeeze(results)

        response = []
        top_k = results.argsort()[-5:][::-1]
        for i in top_k:
            if results[i] >= min_score:
                response.append((self.labels[i], results[i]))

        return response

    def read_tensor_from_image_file(self, file_name, input_height=224, input_width=224, input_mean=128.0, input_std=128.0):
        # Parity-tested PIL preprocessing (replaces the old TF eager decode):
        # decode -> RGB -> bilinear resize to 224x224 -> (x - 128) / 128.
        # Returns None for files PIL cannot decode so the has_results contract
        # (keep existing tags) is preserved.
        try:
            image = Image.open(file_name).convert('RGB').resize(
                (input_width, input_height), Image.Resampling.BILINEAR)
            array = np.asarray(image, dtype=np.float32)
            array = (array - input_mean) / input_std
            return np.expand_dims(array, 0)
        except Exception:
            return None


def save_tags(photo, results, model):
    from photonix.classifiers.runners import get_or_create_tag
    from photonix.photos.models import PhotoTag

    for name, score in results:
        tag = get_or_create_tag(library=photo.library, name=name, type='S', source='C')
        PhotoTag(photo=photo, tag=tag, source='C', confidence=score, significance=score).save()


def run_on_photo(photo_id):
    from photonix.classifiers.runners import run_classifier_on_photo
    # results is None for file formats that can't be read - existing tags
    # must be kept in that case, not cleared
    return run_classifier_on_photo('style', StyleModel, photo_id, 'S', save_tags,
                                   has_results=lambda results: results is not None)


if __name__ == '__main__':
    model = StyleModel()
    if len(sys.argv) != 2:
        print('Argument required: image file path')
        exit(1)

    results = model.predict(sys.argv[1], min_score=0.01)

    if results is None:
        print(f'{sys.argv[1]} could not be processed by style classifier')
    else:
        for label, score in results:
            print('{} (score: {:0.5f})'.format(label, score))
