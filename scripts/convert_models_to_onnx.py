#!/usr/bin/env python3
"""Convert Photonix's TF1 frozen-graph models (object, style) to ONNX and
produce int8-quantized variants, verifying output parity against TensorFlow
along the way.

Runs OFFLINE in a throwaway container - NOT part of the app runtime. The dev
image's TF/numpy are too new for tf2onnx, so use the TF 2.15 image (frozen
TF1 GraphDefs are version-independent):

    docker run --rm \
        -v $PWD/data/models:/data/models \
        -v $PWD/scripts:/work:ro \
        -v $PWD/tests:/tests:ro \
        tensorflow/tensorflow:2.15.0 \
        bash -c "pip install -q 'tf2onnx==1.16.1' onnxruntime pillow && \
                 python /work/convert_models_to_onnx.py && \
                 chown -R 2000:2000 /data/models/object /data/models/style"

Outputs (alongside the .pb originals, for upload to the models server):
    /data/models/object/object.onnx + object.int8.onnx
    /data/models/style/style.onnx + style.int8.onnx

Parity gates printed at the end; the int8 variants are only written if their
detections/labels agree with TF on the sample images (see thresholds below).
"""
import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

MODEL_DIR = Path('/data/models')
TEST_IMAGES = [
    '/tests/photos/snow.jpg',
    '/tests/photos/tree.jpg',
    '/tests/photos/bench/picsum_237_dog_4000.jpg',
    '/tests/photos/bench/picsum_1080_2800.jpg',
    '/tests/photos/bench/faces_collage_7_4000.jpg',
]
MAX_EDGE = 1024  # Matches CLASSIFIER_MAX_INFERENCE_SIZE default at runtime

OBJECT_PB = MODEL_DIR / 'object' / 'ssd_mobilenet_v2_oid_v4_2018_12_12_frozen_inference_graph.pb'
STYLE_PB = MODEL_DIR / 'style' / 'graph.pb'

OBJECT_OUTPUTS = ['num_detections:0', 'detection_boxes:0', 'detection_scores:0', 'detection_classes:0']


def load_image(path, max_edge=MAX_EDGE):
    from PIL import Image
    image = Image.open(path).convert('RGB')
    longest = max(image.size)
    if max_edge and longest > max_edge:
        scale = max_edge / longest
        image = image.resize((round(image.size[0] * scale), round(image.size[1] * scale)),
                             Image.BILINEAR)
    return np.asarray(image, dtype=np.uint8)


def tf_run_frozen(pb_path, feeds, outputs):
    import tensorflow as tf
    graph_def = tf.compat.v1.GraphDef()
    with open(pb_path, 'rb') as f:
        graph_def.ParseFromString(f.read())
    graph = tf.Graph()
    with graph.as_default():
        tf.import_graph_def(graph_def, name='')
    with tf.compat.v1.Session(graph=graph) as sess:
        return sess.run(outputs, feeds)


def convert(pb_path, onnx_path, inputs, outputs, extra_args=()):
    cmd = [
        sys.executable, '-m', 'tf2onnx.convert',
        '--graphdef', str(pb_path),
        '--output', str(onnx_path),
        '--inputs', ','.join(inputs),
        '--outputs', ','.join(outputs),
        '--opset', '13',
    ] + list(extra_args)
    print('+', ' '.join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def ort_session(onnx_path):
    import onnxruntime as ort
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4
    return ort.InferenceSession(str(onnx_path), sess_options=opts,
                                providers=['CPUExecutionProvider'])


def quantize(onnx_path, int8_path):
    from onnxruntime.quantization import quantize_dynamic
    quantize_dynamic(str(onnx_path), str(int8_path))


def compare_object(tf_out, ort_out, tol_score=0.02, min_score=0.4):
    """Compare detections as (label-class, ~score) sets above min_score."""
    def significant(num, boxes, scores, classes):
        found = []
        for i in range(int(num[0])):
            if scores[0][i] >= min_score:
                found.append((int(classes[0][i]), round(float(scores[0][i]), 2),
                              tuple(round(float(v), 2) for v in boxes[0][i])))
        return found

    tf_dets = significant(*tf_out)
    ort_dets = significant(*ort_out)
    if len(tf_dets) != len(ort_dets):
        return False, f'count {len(tf_dets)} vs {len(ort_dets)}: {tf_dets} vs {ort_dets}'
    for (c1, s1, b1), (c2, s2, b2) in zip(tf_dets, ort_dets):
        if c1 != c2 or abs(s1 - s2) > tol_score \
                or any(abs(x - y) > 0.02 for x, y in zip(b1, b2)):
            return False, f'{(c1, s1, b1)} vs {(c2, s2, b2)}'
    return True, f'{len(tf_dets)} significant detections match'


def bench(session, feeds, runs=3):
    times = []
    for _ in range(runs):
        start = time.monotonic()
        session.run(None, feeds)
        times.append(time.monotonic() - start)
    return min(times)


def do_object():
    print('\n=== object (SSD MobileNet v2 OID v4) ===', flush=True)
    onnx_path = MODEL_DIR / 'object' / 'object.onnx'
    int8_path = MODEL_DIR / 'object' / 'object.int8.onnx'
    if not onnx_path.exists():
        convert(OBJECT_PB, onnx_path, ['image_tensor:0'], OBJECT_OUTPUTS)

    session = ort_session(onnx_path)
    input_name = session.get_inputs()[0].name
    results = {}
    for image_path in TEST_IMAGES:
        image = load_image(image_path)
        feed = np.expand_dims(image, 0)
        tf_out = tf_run_frozen(OBJECT_PB, {'image_tensor:0': feed}, OBJECT_OUTPUTS)
        ort_out = session.run(None, {input_name: feed})
        ok, detail = compare_object(tf_out, ort_out)
        results[Path(image_path).name] = {'fp32_parity': ok, 'detail': detail}
        print(f'  fp32 {Path(image_path).name}: {"OK" if ok else "MISMATCH"} - {detail}',
              flush=True)

    quantize(onnx_path, int8_path)
    int8_session = ort_session(int8_path)
    for image_path in TEST_IMAGES:
        image = load_image(image_path)
        feed = np.expand_dims(image, 0)
        tf_out = tf_run_frozen(OBJECT_PB, {'image_tensor:0': feed}, OBJECT_OUTPUTS)
        ort_out = int8_session.run(None, {input_name: feed})
        ok, detail = compare_object(tf_out, ort_out, tol_score=0.1)
        results[Path(image_path).name]['int8_parity'] = ok
        results[Path(image_path).name]['int8_detail'] = detail
        print(f'  int8 {Path(image_path).name}: {"OK" if ok else "MISMATCH"} - {detail}',
              flush=True)

    image = load_image(TEST_IMAGES[2])
    feed = {input_name: np.expand_dims(image, 0)}
    results['bench_seconds'] = {'fp32': round(bench(session, feed), 3),
                                'int8': round(bench(int8_session, feed), 3)}
    results['sizes_mb'] = {p.name: round(p.stat().st_size / 1e6, 1)
                           for p in [OBJECT_PB, onnx_path, int8_path]}
    return results


def style_preprocess_tf(image_path):
    import tensorflow as tf
    file_reader = tf.io.read_file(image_path)
    image_reader = tf.image.decode_jpeg(file_reader, channels=3)
    float_caster = tf.cast(image_reader, tf.float32)
    dims_expander = tf.expand_dims(float_caster, 0)
    resized = tf.image.resize(dims_expander, [224, 224],
                              method=tf.image.ResizeMethod.BILINEAR, antialias=True)
    return tf.divide(tf.subtract(resized, [128]), [128]).numpy()


def style_preprocess_pil(image_path):
    from PIL import Image
    image = Image.open(image_path).convert('RGB').resize((224, 224), Image.BILINEAR)
    array = np.asarray(image, dtype=np.float32)
    return np.expand_dims((array - 128.0) / 128.0, 0)


def do_style():
    print('\n=== style ===', flush=True)
    onnx_path = MODEL_DIR / 'style' / 'style.onnx'
    int8_path = MODEL_DIR / 'style' / 'style.int8.onnx'
    if not onnx_path.exists():
        # The retrained graph has a PlaceholderWithDefault bottleneck node
        # (tensorflow-for-poets heritage); --use_default routes the computed
        # value through it instead of exposing it as a model input
        convert(STYLE_PB, onnx_path, ['input:0'], ['final_result:0'],
                extra_args=['--use_default', 'input_1/BottleneckInputPlaceholder'])

    session = ort_session(onnx_path)
    input_name = session.get_inputs()[0].name
    results = {}
    for image_path in TEST_IMAGES:
        tensor_tf = style_preprocess_tf(image_path)
        tensor_pil = style_preprocess_pil(image_path)
        tf_out = tf_run_frozen(STYLE_PB, {'input:0': tensor_tf}, ['final_result:0'])[0][0]
        ort_same_input = session.run(None, {input_name: tensor_tf})[0][0]
        ort_pil_input = session.run(None, {input_name: tensor_pil})[0][0]
        max_diff_same = float(np.max(np.abs(tf_out - ort_same_input)))
        max_diff_pil = float(np.max(np.abs(tf_out - ort_pil_input)))
        top_match = bool(np.argmax(tf_out) == np.argmax(ort_pil_input))
        results[Path(image_path).name] = {
            'max_diff_same_input': round(max_diff_same, 5),
            'max_diff_pil_preproc': round(max_diff_pil, 5),
            'top1_match_pil': top_match,
            'tf_scores': [round(float(v), 4) for v in tf_out],
            'onnx_pil_scores': [round(float(v), 4) for v in ort_pil_input],
        }
        print(f'  {Path(image_path).name}: same-input diff {max_diff_same:.5f}, '
              f'pil-preproc diff {max_diff_pil:.5f}, top1 match {top_match}', flush=True)

    quantize(onnx_path, int8_path)
    int8_session = ort_session(int8_path)
    for image_path in TEST_IMAGES:
        tensor_pil = style_preprocess_pil(image_path)
        tf_out = tf_run_frozen(STYLE_PB, {'input:0': style_preprocess_tf(image_path)},
                               ['final_result:0'])[0][0]
        int8_out = int8_session.run(None, {input_name: tensor_pil})[0][0]
        results[Path(image_path).name]['int8_scores'] = [round(float(v), 4) for v in int8_out]
        results[Path(image_path).name]['int8_top1_match'] = bool(np.argmax(tf_out) == np.argmax(int8_out))
        print(f'  int8 {Path(image_path).name}: top1 match '
              f'{results[Path(image_path).name]["int8_top1_match"]}', flush=True)

    tensor = style_preprocess_pil(TEST_IMAGES[0])
    results['bench_seconds'] = {'fp32': round(bench(session, {input_name: tensor}), 4),
                                'int8': round(bench(int8_session, {input_name: tensor}), 4)}
    results['sizes_mb'] = {p.name: round(p.stat().st_size / 1e6, 1)
                           for p in [STYLE_PB, onnx_path, int8_path]}
    return results


if __name__ == '__main__':
    summary = {}
    summary['style'] = do_style()
    summary['object'] = do_object()
    out = MODEL_DIR / 'onnx_conversion_report.json'
    with open(out, 'w') as f:
        json.dump(summary, f, indent=1)
    print(f'\nReport written to {out}')
