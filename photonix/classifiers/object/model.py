import os
import sys
from pathlib import Path

from django.utils import timezone
import numpy as np
from PIL import Image
from redis_lock import Lock
import tensorflow as tf

from photonix.classifiers.object.utils import label_map_util
from photonix.classifiers.base_model import BaseModel
from photonix.photos.utils.redis import redis_connection
from photonix.photos.utils.metadata import PhotoMetadata


GRAPH_FILE = os.path.join('object', 'ssd_mobilenet_v2_oid_v4_2018_12_12_frozen_inference_graph.pb')
LABEL_FILE = os.path.join('object', 'oid_v4_label_map.pbtxt')


class ObjectModel(BaseModel):
    name = 'object'
    version = 20190407
    approx_ram_mb = 2000

    def __init__(self, model_dir=None, graph_file=GRAPH_FILE, label_file=LABEL_FILE, lock_name=None):
        super().__init__(model_dir=model_dir)

        graph_file = os.path.join(self.model_dir, graph_file)
        label_file = os.path.join(self.model_dir, label_file)

        if self.ensure_downloaded(lock_name=lock_name):
            self.graph = self.load_graph(graph_file)
            self.labels = self.load_labels(label_file)

    def load_graph(self, graph_file):
        with Lock(redis_connection, 'classifier_{}_load_graph'.format(self.name)):
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
        label_map = label_map_util.load_labelmap(label_file)
        categories = label_map_util.convert_label_map_to_categories(label_map, max_num_classes=1000, use_display_name=True)
        return label_map_util.create_category_index(categories)

    def load_image_into_numpy_array(self, image):
        (im_width, im_height) = image.size
        return np.array(image.getdata()).reshape((im_height, im_width, 3)).astype(np.uint8)

    def run_inference_for_single_image(self, image):
        with self.graph.as_default():
            with tf.compat.v1.Session() as sess:
                # Get handles to input and output tensors
                ops = tf.compat.v1.get_default_graph().get_operations()
                all_tensor_names = {output.name for op in ops for output in op.outputs}
                tensor_dict = {}
                for key in [
                    'num_detections', 'detection_boxes', 'detection_scores',
                    'detection_classes', 'detection_masks'
                ]:
                    tensor_name = key + ':0'
                    if tensor_name in all_tensor_names:
                        tensor_dict[key] = tf.compat.v1.get_default_graph().get_tensor_by_name(tensor_name)
                if 'detection_masks' in tensor_dict:
                    # The following processing is only for single image
                    detection_boxes = tf.squeeze(tensor_dict['detection_boxes'], [0])
                    # Reframe is required to translate mask from box coordinates to image coordinates and fit the image size.
                    real_num_detection = tf.cast(tensor_dict['num_detections'][0], tf.int32)
                    detection_boxes = tf.slice(detection_boxes, [0, 0], [real_num_detection, -1])
                image_tensor = tf.compat.v1.get_default_graph().get_tensor_by_name('image_tensor:0')

                # Run inference
                output_dict = sess.run(tensor_dict, feed_dict={image_tensor: np.expand_dims(image, 0)})

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

    def predict(self, image_file, min_score=0.1):
        image = Image.open(image_file)

        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Perform rotations if decalared in metadata
        metadata = PhotoMetadata(image_file)
        if metadata.get('Orientation') in ['Rotate 90 CW', 'Rotate 270 CCW']:
            image = image.rotate(-90, expand=True)
        elif metadata.get('Orientation') in ['Rotate 90 CCW', 'Rotate 270 CW']:
            image = image.rotate(90, expand=True)

        # the array based representation of the image will be used later in order to prepare the
        # result image with boxes and labels on it.
        image_np = self.load_image_into_numpy_array(image)
        # Expand dimensions since the model expects images to have shape: [1, None, None, 3]
        np.expand_dims(image_np, axis=0)
        # Actual detection.
        output_dict = self.run_inference_for_single_image(image_np)
        return self.format_output(output_dict, min_score)


def run_on_photo(photo_id):
    model = ObjectModel()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from photonix.classifiers.runners import results_for_model_on_photo, get_or_create_tag
    photo, results = results_for_model_on_photo(model, photo_id)

    if photo:
        from photonix.photos.models import PhotoTag
        photo.clear_tags(source='C', type='O')
        for result in results:
            if result['label'] != 'Human face':  # We have a specialised face detector
                tag = get_or_create_tag(library=photo.library, name=result['label'], type='O', source='C')
                PhotoTag(photo=photo, tag=tag, source='C', confidence=result['score'], significance=result['significance'], position_x=result['x'], position_y=result['y'], size_x=result['width'], size_y=result['height']).save()
        photo.classifier_object_completed_at = timezone.now()
        photo.classifier_object_version = getattr(model, 'version', 0)
        photo.save()

    return photo, results


if __name__ == '__main__':
    model = ObjectModel()
    if len(sys.argv) != 2:
        print('Argument required: image file path or Photo ID')
        exit(1)

    results = run_on_photo(sys.argv[1])

    for result in results:
        print('{} (score: {:0.5f}, significance: {:0.5f}, x: {:0.5f}, y: {:0.5f}, width: {:0.5f}, height: {:0.5f})'.format(result['label'], result['score'], result['significance'], result['x'], result['y'], result['width'], result['height']))
