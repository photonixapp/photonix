import os
import sys

import numpy as np
from PIL import Image, ImageOps as PILImageOps

from photonix.classifiers.base_model import BaseModel, ensure_tensorflow as _ensure_tensorflow, tf_session_config
from photonix.classifiers.image_utils import downscale_for_inference

# Lazy-loaded modules (heavy imports)
label_map_util = None


def _ensure_label_map_util():
    """Lazy load label_map_util on first use (imports TensorFlow)."""
    global label_map_util
    if label_map_util is None:
        from photonix.classifiers.object.utils import label_map_util as _label_map_util
        label_map_util = _label_map_util
    return label_map_util


GRAPH_FILE = os.path.join('object', 'ssd_mobilenet_v2_oid_v4_2018_12_12_frozen_inference_graph.pb')
LABEL_FILE = os.path.join('object', 'oid_v4_label_map.pbtxt')


class ObjectModel(BaseModel):
    name = 'object'
    version = 20190407
    approx_ram_mb = 2000

    def __init__(self, model_dir=None, graph_file=GRAPH_FILE, label_file=LABEL_FILE, lock_name=None):
        super().__init__(model_dir=model_dir)

        self._graph_file = os.path.join(self.model_dir, graph_file)
        self._label_file = os.path.join(self.model_dir, label_file)
        self._lock_name = lock_name
        self.graph = None
        self.labels = None
        self.session = None
        self.tensor_dict = None
        self.image_tensor = None

        # Download model files eagerly (cheap), but don't load into memory yet
        self.ensure_downloaded(lock_name=lock_name)

    def load(self):
        tf = _ensure_tensorflow()
        self.graph = self.load_graph(self._graph_file)
        self.labels = self.load_labels(self._label_file)

        # Reuse a single session across photos (and across re-instantiated
        # models in this process) instead of building one per prediction.
        session_key = f'{self.graph_cache_key}:session'
        with self.load_lock():
            if session_key in self.graph_cache:
                self.session = self.graph_cache[session_key]
            else:
                self.session = tf.compat.v1.Session(graph=self.graph, config=tf_session_config())
                self.graph_cache[session_key] = self.session

        # Precompute tensor handles once at load rather than walking every
        # graph op on each prediction.
        ops = self.graph.get_operations()
        all_tensor_names = {output.name for op in ops for output in op.outputs}
        self.tensor_dict = {}
        for key in [
            'num_detections', 'detection_boxes', 'detection_scores',
            'detection_classes', 'detection_masks'
        ]:
            tensor_name = key + ':0'
            if tensor_name in all_tensor_names:
                self.tensor_dict[key] = self.graph.get_tensor_by_name(tensor_name)
        self.image_tensor = self.graph.get_tensor_by_name('image_tensor:0')

    def load_graph(self, graph_file):
        tf = _ensure_tensorflow()
        with self.load_lock():
            if self.graph_cache_key in self.graph_cache:
                return self.graph_cache[self.graph_cache_key]

            graph = tf.Graph()
            graph_def = tf.compat.v1.GraphDef()

            with graph.as_default():
                od_graph_def = tf.compat.v1.GraphDef()
                with tf.io.gfile.GFile(graph_file, 'rb') as fid:
                    serialized_graph = fid.read()
                    od_graph_def.ParseFromString(serialized_graph)
                    tf.import_graph_def(od_graph_def, name='')

            self.graph_cache[self.graph_cache_key] = graph
            return graph

    def load_labels(self, label_file):
        lmu = _ensure_label_map_util()
        label_map = lmu.load_labelmap(label_file)
        categories = lmu.convert_label_map_to_categories(label_map, max_num_classes=1000, use_display_name=True)
        return lmu.create_category_index(categories)

    def load_image_into_numpy_array(self, image):
        return np.asarray(image, dtype=np.uint8)

    def run_inference_for_single_image(self, image):
        # Run inference on the reused session with the precomputed handles
        output_dict = self.session.run(
            self.tensor_dict,
            feed_dict={self.image_tensor: np.expand_dims(image, 0)})

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
