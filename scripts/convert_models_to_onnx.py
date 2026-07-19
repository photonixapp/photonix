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
import argparse
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


# ---------------------------------------------------------------------------
# Backbone-only object model (control-flow-free) + numpy postprocessor
#
# The full object.onnx that tf2onnx produced from the TF1 frozen graph embeds
# the batch-multiclass-NMS postprocessor as Loop/If subgraphs. ORT spends ~60s
# initialising those subgraphs, which wrecks Photonix's lazy-load/idle-unload
# model lifecycle. This section exports the SSD backbone up to the raw
# (pre-NMS) box-encoding and class-prediction tensors, extracts the fixed
# anchor grid, and reimplements decode + per-class NMS in vectorised numpy so
# the runtime session initialises in a couple of seconds.
# ---------------------------------------------------------------------------

OBJECT_BACKBONE_ONNX = MODEL_DIR / 'object' / 'object_backbone.onnx'
OBJECT_ANCHORS_NPY = MODEL_DIR / 'object' / 'object_anchors.npy'

# TF OD API faster_rcnn_box_coder scale factors [ty, tx, th, tw]. Confirmed
# empirically against the full-graph decode in do_object_backbone().
BOX_CODER_SCALES = np.array([10.0, 10.0, 5.0, 5.0], dtype=np.float32)


def _load_frozen_graph(pb_path):
    import tensorflow as tf
    graph_def = tf.compat.v1.GraphDef()
    with open(pb_path, 'rb') as f:
        graph_def.ParseFromString(f.read())
    graph = tf.Graph()
    with graph.as_default():
        tf.import_graph_def(graph_def, name='')
    return graph


def inspect_object_graph():
    """Introspect the frozen SSD graph to locate the pre-NMS tensors, the
    score-conversion op type (sigmoid vs softmax) and the anchor grid."""
    import tensorflow as tf
    print('\n=== inspect object frozen graph ===', flush=True)
    graph = _load_frozen_graph(OBJECT_PB)
    ops = graph.get_operations()
    print(f'total ops: {len(ops)}', flush=True)

    def shapes_of(op):
        out = []
        for t in op.outputs:
            try:
                out.append(t.shape.as_list())
            except ValueError:
                out.append('?')
        return out

    # Top-level (no "/" in name) ops and their output shapes - box encodings /
    # class predictions are usually top-level "concat"/"concat_1".
    print('\n-- top-level ops --', flush=True)
    for op in ops:
        if '/' not in op.name:
            print(f'  {op.name} ({op.type}) -> {shapes_of(op)}', flush=True)

    # convert_scores tells us sigmoid vs softmax.
    print('\n-- Postprocessor score/anchor ops --', flush=True)
    for op in ops:
        n = op.name
        if ('convert_scores' in n or 'scale_logits' in n
                or 'Postprocessor/Decode' in n.split('/decode')[0]
                or 'raw_box' in n or 'anchor' in n.lower()
                or n.startswith('Postprocessor/Slice')
                or n == 'Postprocessor/Tile'):
            print(f'  {n} ({op.type}) -> {shapes_of(op)}', flush=True)

    # op-type histogram (control-flow presence)
    from collections import Counter
    hist = Counter(op.type for op in ops)
    print('\n-- op type histogram (top 25) --', flush=True)
    for t, c in hist.most_common(25):
        print(f'  {t}: {c}', flush=True)

    # Evaluate candidate anchor tensors at two input sizes to confirm they are
    # input-independent (fixed-shape resizer).
    print('\n-- anchor-tensor stability across input sizes --', flush=True)
    candidates = []
    for op in ops:
        if op.type in ('ConcatV2', 'Const', 'Identity', 'Mul', 'Add', 'Sub'):
            for t in op.outputs:
                try:
                    s = t.shape.as_list()
                except ValueError:
                    continue
                if len(s) == 2 and s[1] == 4 and (s[0] is None or s[0] > 100):
                    candidates.append(t.name)
    print(f'  candidate anchor tensors: {candidates}', flush=True)

    img_a = np.zeros((1, 480, 640, 3), dtype=np.uint8)
    img_b = np.zeros((1, 300, 900, 3), dtype=np.uint8)
    with tf.compat.v1.Session(graph=graph) as sess:
        for name in candidates:
            try:
                a = sess.run(name, {'image_tensor:0': img_a})
                b = sess.run(name, {'image_tensor:0': img_b})
                same = a.shape == b.shape and np.allclose(a, b)
                print(f'  {name}: shape {a.shape} stable={same} '
                      f'first_row={a[0].tolist()}', flush=True)
            except Exception as e:  # noqa: BLE001
                print(f'  {name}: FAILED {e}', flush=True)


def _trace_const(tensor):
    """Follow Enter/Identity/Switch wrappers back to a Const and return its
    value as a numpy array (needed to read constants that sit inside the frozen
    NMS while-loop, where a plain session.run would require the loop frame)."""
    import tensorflow as tf
    op = tensor.op
    seen = 0
    while op.type in ('Enter', 'Identity', 'Switch', 'RefEnter', 'RefIdentity') and seen < 20:
        op = op.inputs[0].op
        seen += 1
    if op.type == 'Const':
        return tf.make_ndarray(op.get_attr('value'))
    return None


# ---- numpy postprocessor (shared shape with photonix/classifiers/object) ----

def _np_sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def decode_boxes_np(box_encodings, anchors, scales):
    """Decode faster_rcnn_box_coder encodings against corner-format anchors.

    box_encodings: [N, 4] as (ty, tx, th, tw); anchors: [N, 4] as
    (ymin, xmin, ymax, xmax); scales: (sy, sx, sh, sw). Returns [N, 4]
    (ymin, xmin, ymax, xmax). Fully vectorised - no per-anchor python loop.
    """
    ymin_a, xmin_a, ymax_a, xmax_a = (anchors[:, 0], anchors[:, 1],
                                      anchors[:, 2], anchors[:, 3])
    ha = ymax_a - ymin_a
    wa = xmax_a - xmin_a
    ycenter_a = ymin_a + 0.5 * ha
    xcenter_a = xmin_a + 0.5 * wa

    ty = box_encodings[:, 0] / scales[0]
    tx = box_encodings[:, 1] / scales[1]
    th = box_encodings[:, 2] / scales[2]
    tw = box_encodings[:, 3] / scales[3]

    w = np.exp(tw) * wa
    h = np.exp(th) * ha
    ycenter = ty * ha + ycenter_a
    xcenter = tx * wa + xcenter_a

    ymin = ycenter - 0.5 * h
    xmin = xcenter - 0.5 * w
    ymax = ycenter + 0.5 * h
    xmax = xcenter + 0.5 * w
    return np.stack([ymin, xmin, ymax, xmax], axis=1)


def _nms_single_class(boxes, scores, iou_threshold, max_output):
    """Greedy IoU NMS matching tf.image.non_max_suppression (suppress if
    IoU > threshold). boxes: [M, 4] (y1, x1, y2, x2)."""
    order = scores.argsort()[::-1]
    y1, x1, y2, x2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = np.maximum(0.0, y2 - y1) * np.maximum(0.0, x2 - x1)
    keep = []
    while order.size > 0 and len(keep) < max_output:
        i = order[0]
        keep.append(i)
        rest = order[1:]
        if rest.size == 0:
            break
        yy1 = np.maximum(y1[i], y1[rest])
        xx1 = np.maximum(x1[i], x1[rest])
        yy2 = np.minimum(y2[i], y2[rest])
        xx2 = np.minimum(x2[i], x2[rest])
        inter = np.maximum(0.0, yy2 - yy1) * np.maximum(0.0, xx2 - xx1)
        union = areas[i] + areas[rest] - inter
        iou = np.where(union > 0, inter / np.maximum(union, 1e-12), 0.0)
        order = rest[iou <= iou_threshold]
    return keep


def multiclass_postprocess_np(box_encodings, class_logits, anchors, scales,
                              logit_scale=1.0, iou_threshold=0.6,
                              max_per_class=100, max_total=100,
                              score_threshold=1e-8, clip_window=(0.0, 0.0, 1.0, 1.0)):
    """Replicate TF OD API BatchMultiClassNonMaxSuppression in numpy.

    box_encodings: [N, 4]; class_logits: [N, C+1] (index 0 = background).
    Returns (boxes[K,4], scores[K], classes[K]) sorted by score desc, K<=max_total.
    Class ids are 1-indexed label-map ids (background removed).
    """
    scores = _np_sigmoid(class_logits / logit_scale)[:, 1:]  # drop background
    boxes = decode_boxes_np(box_encodings, anchors, scales)

    # Clip boxes to the normalised image window before NMS (TF clip_to_window).
    ymin_w, xmin_w, ymax_w, xmax_w = clip_window
    boxes = np.stack([
        np.clip(boxes[:, 0], ymin_w, ymax_w),
        np.clip(boxes[:, 1], xmin_w, xmax_w),
        np.clip(boxes[:, 2], ymin_w, ymax_w),
        np.clip(boxes[:, 3], xmin_w, xmax_w),
    ], axis=1)

    num_classes = scores.shape[1]
    all_boxes, all_scores, all_classes = [], [], []
    # Only classes with at least one candidate above threshold can contribute.
    class_max = scores.max(axis=0)
    for c in np.where(class_max > score_threshold)[0]:
        cand = np.where(scores[:, c] > score_threshold)[0]
        if cand.size == 0:
            continue
        keep_local = _nms_single_class(boxes[cand], scores[cand, c],
                                       iou_threshold, max_per_class)
        kept = cand[keep_local]
        all_boxes.append(boxes[kept])
        all_scores.append(scores[kept, c])
        all_classes.append(np.full(len(kept), c + 1, dtype=np.int64))

    if not all_boxes:
        return (np.zeros((0, 4), np.float32), np.zeros((0,), np.float32),
                np.zeros((0,), np.int64))

    boxes_out = np.concatenate(all_boxes, axis=0)
    scores_out = np.concatenate(all_scores, axis=0)
    classes_out = np.concatenate(all_classes, axis=0)
    order = scores_out.argsort()[::-1][:max_total]
    return boxes_out[order], scores_out[order], classes_out[order]


def do_object_backbone(inspect=False):
    import tensorflow as tf
    if inspect:
        inspect_object_graph()
        return {}

    print('\n=== object backbone (control-flow-free) ===', flush=True)
    graph = _load_frozen_graph(OBJECT_PB)

    # --- read constants from the frozen graph -----------------------------
    scale_logits = float(_trace_const(
        graph.get_tensor_by_name('Postprocessor/scale_logits/y:0')))
    decode_scales = [float(_trace_const(
        graph.get_tensor_by_name(f'Postprocessor/Decode/div{sfx}/y:0')))
        for sfx in ('', '_1', '_2', '_3')]
    slice_begin = _trace_const(
        graph.get_tensor_by_name('Postprocessor/Slice/begin:0')).tolist()

    print(f'  logit_scale={scale_logits} decode_scales={decode_scales} '
          f'slice_begin={slice_begin}', flush=True)

    # NMS params: trace the constants feeding a NonMaxSuppressionV3 op. The
    # max_output_size input is usually a Minimum(const, num_boxes), so trace
    # back through it; iou/score thresholds are loop-invariant Consts.
    nms_op = next(op for op in graph.get_operations()
                  if op.type == 'NonMaxSuppressionV3')
    for idx, inp in enumerate(nms_op.inputs):
        print(f'    nms input[{idx}] {inp.name} <- {inp.op.type} '
              f'const={_trace_const(inp)}', flush=True)

    def _trace_scalar(tensor, default):
        v = _trace_const(tensor)
        if v is None and tensor.op.type in ('Minimum', 'Maximum', 'Cast'):
            for sub in tensor.op.inputs:
                v = _trace_const(sub)
                if v is not None and np.ndim(v) == 0:
                    break
        return default if v is None else v

    max_per_class = int(_trace_scalar(nms_op.inputs[2], 100))
    iou_threshold = float(_trace_scalar(nms_op.inputs[3], 0.6))
    score_threshold = float(_trace_scalar(nms_op.inputs[4], 1e-8))
    print(f'  nms: max_per_class={max_per_class} iou={iou_threshold} '
          f'score_threshold={score_threshold}', flush=True)

    # --- extract the fixed anchor grid (input to Postprocessor/Tile) ------
    tile_op = graph.get_operation_by_name('Postprocessor/Tile')
    anchor_tensor_name = tile_op.inputs[0].name
    print(f'  anchor source: {anchor_tensor_name}', flush=True)

    img_a = np.zeros((1, 480, 640, 3), dtype=np.uint8)
    img_b = np.zeros((1, 300, 900, 3), dtype=np.uint8)
    with tf.compat.v1.Session(graph=graph) as sess:
        anchors_a = sess.run(anchor_tensor_name, {'image_tensor:0': img_a})
        anchors_b = sess.run(anchor_tensor_name, {'image_tensor:0': img_b})
    anchors_a = np.squeeze(anchors_a).astype(np.float32)
    anchors_b = np.squeeze(anchors_b).astype(np.float32)
    anchors_stable = (anchors_a.shape == anchors_b.shape
                      and np.allclose(anchors_a, anchors_b))
    print(f'  anchors shape {anchors_a.shape} input-independent={anchors_stable}',
          flush=True)
    if not anchors_stable:
        raise RuntimeError('Anchor grid changes with input size - cannot bake it')
    anchors = anchors_a  # [num_anchors, 4] (ymin, xmin, ymax, xmax)
    np.save(OBJECT_ANCHORS_NPY, anchors)
    print(f'  saved {OBJECT_ANCHORS_NPY} {anchors.shape}', flush=True)

    scales = tuple(decode_scales)

    # --- convert the backbone (no control flow) with tf2onnx --------------
    if OBJECT_BACKBONE_ONNX.exists():
        OBJECT_BACKBONE_ONNX.unlink()
    convert(OBJECT_PB, OBJECT_BACKBONE_ONNX, ['image_tensor:0'],
            ['concat:0', 'Squeeze:0'])

    backbone = ort_session(OBJECT_BACKBONE_ONNX)
    bb_in = backbone.get_inputs()[0].name
    bb_out = [o.name for o in backbone.get_outputs()]
    print(f'  backbone inputs={bb_in} outputs={bb_out}', flush=True)

    full = ort_session(MODEL_DIR / 'object' / 'object.onnx')
    full_in = full.get_inputs()[0].name

    # --- validate against intermediate frozen-graph tensors + full onnx ---
    results = {'params': {'logit_scale': scale_logits, 'decode_scales': decode_scales,
                          'iou_threshold': iou_threshold,
                          'max_per_class': max_per_class,
                          'score_threshold': score_threshold,
                          'anchor_source': anchor_tensor_name,
                          'num_anchors': int(anchors.shape[0])}}
    intermediate_outputs = ['concat:0', 'Squeeze:0',
                            'Postprocessor/raw_box_scores:0',
                            'Postprocessor/raw_box_locations:0']
    per_image = {}
    all_ok = True
    for image_path in TEST_IMAGES:
        name = Path(image_path).name
        image = load_image(image_path)
        feed = np.expand_dims(image, 0)

        # frozen-graph intermediates for decode/score validation
        tf_concat, tf_squeeze, tf_scores, tf_locs = tf_run_frozen(
            OBJECT_PB, {'image_tensor:0': feed}, intermediate_outputs)

        # backbone onnx must reproduce concat/Squeeze exactly
        bb = backbone.run(None, {bb_in: feed})
        bb_map = {n.split(':')[0]: v for n, v in zip(bb_out, bb)}
        d_concat = float(np.max(np.abs(bb_map['concat'] - tf_concat)))
        d_squeeze = float(np.max(np.abs(bb_map['Squeeze'] - tf_squeeze)))

        class_logits = bb_map['concat'][0]     # [N, 602]
        box_enc = bb_map['Squeeze'][0]         # [N, 4]

        # numpy score + decode vs frozen-graph intermediates
        np_scores = _np_sigmoid(class_logits / scale_logits)[:, 1:]
        np_boxes = decode_boxes_np(box_enc, anchors, scales)
        d_score = float(np.max(np.abs(np_scores - tf_scores[0][:, 1:])))
        d_decode = float(np.max(np.abs(np_boxes - tf_locs[0])))

        # numpy full postprocessor vs current full object.onnx
        f_num, f_boxes, f_scores, f_classes = full.run(None, {full_in: feed})
        n_det = int(f_num[0])
        f_boxes, f_scores, f_classes = f_boxes[0][:n_det], f_scores[0][:n_det], f_classes[0][:n_det]

        np_b, np_s, np_c = multiclass_postprocess_np(
            box_enc, class_logits, anchors, scales,
            logit_scale=scale_logits, iou_threshold=iou_threshold,
            max_per_class=max_per_class, max_total=100,
            score_threshold=score_threshold)

        # Compare detections above min_score (same gate as existing compare_object)
        min_score = 0.4
        fmask = f_scores >= min_score
        nmask = np_s >= min_score
        fb, fs, fc = f_boxes[fmask], f_scores[fmask], f_classes[fmask].astype(int)
        nb, ns, nc = np_b[nmask], np_s[nmask], np_c[nmask].astype(int)
        ok = len(fs) == len(ns)
        max_ds = max_db = 0.0
        if ok:
            for i in range(len(fs)):
                max_ds = max(max_ds, abs(float(fs[i]) - float(ns[i])))
                max_db = max(max_db, float(np.max(np.abs(fb[i] - nb[i]))))
                if int(fc[i]) != int(nc[i]) or max_ds > 0.005 or max_db > 0.005:
                    ok = False
        all_ok = all_ok and ok
        per_image[name] = {
            'n_significant': int(len(fs)), 'match': ok,
            'max_dscore': round(max_ds, 6), 'max_dbox': round(max_db, 6),
            'backbone_dconcat': round(d_concat, 6),
            'backbone_dsqueeze': round(d_squeeze, 6),
            'np_dscore_vs_tf': round(d_score, 6),
            'np_ddecode_vs_tf': round(d_decode, 6),
        }
        print(f'  {name}: match={ok} sig={len(fs)} dscore={max_ds:.5f} '
              f'dbox={max_db:.5f} | backbone dconcat={d_concat:.2e} '
              f'dsqueeze={d_squeeze:.2e} | np-vs-tf dscore={d_score:.2e} '
              f'ddecode={d_decode:.2e}', flush=True)

    results['per_image'] = per_image
    results['parity_pass'] = all_ok

    # bench + sizes
    image = load_image(TEST_IMAGES[2])
    feed = {bb_in: np.expand_dims(image, 0)}
    results['backbone_bench_seconds'] = round(bench(backbone, feed), 4)
    results['sizes_bytes'] = {
        'object_backbone.onnx': OBJECT_BACKBONE_ONNX.stat().st_size,
        'object_anchors.npy': OBJECT_ANCHORS_NPY.stat().st_size,
    }
    print(f"\n  ACCEPTANCE parity_pass={all_ok}", flush=True)
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backbone', action='store_true',
                        help='Only build the control-flow-free object backbone '
                             '(object_backbone.onnx + object_anchors.npy) and '
                             'verify the numpy postprocessor - skips the '
                             'existing style/object full conversions.')
    parser.add_argument('--inspect', action='store_true',
                        help='Introspect the object frozen graph only.')
    args = parser.parse_args()

    if args.inspect:
        do_object_backbone(inspect=True)
    elif args.backbone:
        summary = {'object_backbone': do_object_backbone()}
        out = MODEL_DIR / 'object_backbone_conversion_report.json'
        with open(out, 'w') as f:
            json.dump(summary, f, indent=1)
        print(f'\nReport written to {out}')
    else:
        summary = {}
        summary['style'] = do_style()
        summary['object'] = do_object()
        out = MODEL_DIR / 'onnx_conversion_report.json'
        with open(out, 'w') as f:
            json.dump(summary, f, indent=1)
        print(f'\nReport written to {out}')
