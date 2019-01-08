import os
from pathlib import Path
import sys

from django.conf import settings
import numpy as np
import redis
from redis_lock import Lock
import tensorflow as tf

# Handle running this script directly from command line
try:
    from ..base_model import BaseModel
except ValueError:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from base_model import BaseModel


r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))
GRAPH_FILE = os.path.join('style', 'graph.pb')
LABEL_FILE = os.path.join('style', 'labels.txt')


class StyleModel(BaseModel):
    name = 'style'
    version = 20180624
    approx_ram_mb = 100
    max_num_workers = 2

    def __init__(self, graph_file=GRAPH_FILE, label_file=LABEL_FILE, lock_name=None, model_dir=None):
        super().__init__(model_dir=model_dir)

        graph_file = os.path.join(self.model_dir, graph_file)
        label_file = os.path.join(self.model_dir, label_file)

        if self.ensure_downloaded(lock_name=lock_name):
            self.graph = self.load_graph(graph_file)
            self.labels = self.load_labels(label_file)

    def load_graph(self, graph_file):
        with Lock(r, 'classifier_{}_load_graph'.format(self.name)):
            if self.name in self.graph_cache:
                return self.graph_cache[self.name]

            graph = tf.Graph()
            graph_def = tf.GraphDef()

            with open(graph_file, 'rb') as f:
                graph_def.ParseFromString(f.read())
            with graph.as_default():
                tf.import_graph_def(graph_def)

            self.graph_cache[self.name] = graph
            return graph

    def load_labels(self, label_file):
        labels = []
        proto_as_ascii_lines = tf.gfile.GFile(label_file).readlines()
        for l in proto_as_ascii_lines:
            labels.append(l.rstrip())
        return labels

    def predict(self, image_file, min_score=0.66):
        input_height = 224
        input_width = 224
        input_mean = 128
        input_std = 128
        input_layer = "input"
        output_layer = "final_result"

        t = self.read_tensor_from_image_file(
            image_file,
            input_height=input_height,
            input_width=input_width,
            input_mean=input_mean,
            input_std=input_std)

        input_name = "import/" + input_layer
        output_name = "import/" + output_layer
        input_operation = self.graph.get_operation_by_name(input_name)
        output_operation = self.graph.get_operation_by_name(output_name)

        with tf.Session(graph=self.graph) as sess:
            results = sess.run(output_operation.outputs[0], {input_operation.outputs[0]: t})
        results = np.squeeze(results)

        response = []
        top_k = results.argsort()[-5:][::-1]
        for i in top_k:
            if results[i] >= min_score:
                response.append((self.labels[i], results[i]))

        return response

    def read_tensor_from_image_file(self, file_name, input_height=299, input_width=299, input_mean=0, input_std=255):
        input_name = "file_reader"

        file_reader = tf.read_file(file_name, input_name)
        if file_name.endswith(".png"):
            image_reader = tf.image.decode_png(file_reader, channels = 3, name='png_reader')
        elif file_name.endswith(".gif"):
            image_reader = tf.squeeze(tf.image.decode_gif(file_reader, name='gif_reader'))
        elif file_name.endswith(".bmp"):
            image_reader = tf.image.decode_bmp(file_reader, name='bmp_reader')
        else:
            image_reader = tf.image.decode_jpeg(file_reader, channels = 3, name='jpeg_reader')
        float_caster = tf.cast(image_reader, tf.float32)
        dims_expander = tf.expand_dims(float_caster, 0)
        resized = tf.image.resize_bilinear(dims_expander, [input_height, input_width])
        normalized = tf.divide(tf.subtract(resized, [input_mean]), [input_std])
        sess = tf.Session()
        return sess.run(normalized)


def run_on_photo(photo_id):
    model = StyleModel()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from runners import results_for_model_on_photo, get_or_create_tag
    photo, results = results_for_model_on_photo(model, photo_id)

    if photo:
        from django.utils import timezone
        from photos.models import PhotoTag
        photo.clear_tags(source='C', type='S')
        for name, score in results:
            tag = get_or_create_tag(name=name, type='S', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=score, significance=score).save()
        photo.classifier_style_completed_at = timezone.now()
        photo.classifier_style_version = getattr(model, 'version', 0)
        photo.save()

    return photo, results


if __name__ == '__main__':
    model = StyleModel()
    if len(sys.argv) != 2:
        print('Argument required: image file path')
        exit(1)

    results = model.predict(sys.argv[1], min_score=0.01)

    for label, score in results:
        print('{} (score: {:0.5f})'.format(label, score))
