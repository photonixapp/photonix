#!/usr/bin/env python3
"""Benchmark one classifier over a fixed image set, recording wall time,
memory and prediction outputs (golden files) as JSON.

Run inside the dev container so paths, deps and Redis match production:

    docker compose -f docker/docker-compose.dev.yml exec -T photonix \
        env PYTHONPATH=/srv python /srv/tests/benchmarks/bench_classifiers.py \
        --classifier object --label baseline-tf

One classifier per process so peak RSS is attributable. Results land in
/data/cache/benchmarks/<label>/<classifier>.json (the cache volume is
writable by the container user and gitignored on the host).

Compare two labels with compare_results.py.
"""
import argparse
import json
import os
import resource
import sys
import time
from pathlib import Path


def setup_django():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'photonix.web.settings')
    import django
    django.setup()


def rss_mb():
    import psutil
    return psutil.Process().memory_info().rss / (1024 * 1024)


def peak_rss_mb():
    # ru_maxrss is KB on Linux
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


def list_images(image_dirs):
    exts = {'.jpg', '.jpeg', '.png'}
    files = []
    for image_dir in image_dirs:
        path = Path(image_dir)
        if path.is_file():
            files.append(path)
        else:
            files.extend(p for p in sorted(path.iterdir()) if p.suffix.lower() in exts)
    return files


def round_floats(value, places=4):
    if isinstance(value, float):
        return round(value, places)
    if isinstance(value, (list, tuple)):
        return [round_floats(v, places) for v in value]
    if isinstance(value, dict):
        return {k: round_floats(v, places) for k, v in value.items()}
    return value


def normalise_result(classifier, result):
    """Convert classifier-specific predict() output to JSON-safe form."""
    if result is None:
        return None
    if classifier == 'object':
        return [
            {
                'label': r['label'],
                'score': round(float(r['score']), 4),
                'x': round(float(r['x']), 4),
                'y': round(float(r['y']), 4),
                'width': round(float(r['width']), 4),
                'height': round(float(r['height']), 4),
            }
            for r in result
        ]
    if classifier == 'face':
        return [
            {
                'box': [int(v) for v in r['box']],
                'confidence': round(float(r['confidence']), 4),
                'embedding': round_floats([float(v) for v in r.get('embedding', [])], 4),
            }
            for r in result
        ]
    # style: [(label, score)], color: [(name, score)]
    return [[label, round(float(score), 4)] for label, score in result]


def build_model(classifier):
    if classifier == 'object':
        from photonix.classifiers.object.model import ObjectModel
        return ObjectModel()
    if classifier == 'style':
        from photonix.classifiers.style.model import StyleModel
        return StyleModel()
    if classifier == 'color':
        from photonix.classifiers.color.model import ColorModel
        return ColorModel()
    if classifier == 'face':
        from photonix.classifiers.face.model import FaceModel
        return FaceModel()
    raise SystemExit(f'Unknown classifier: {classifier}')


def predict_one(classifier, model, image_path):
    result = model.predict(str(image_path))
    if classifier == 'face' and result:
        # Include the embedding step - it is part of the real per-photo cost
        # and its outputs are what parity checks care about most
        from PIL import Image, ImageOps
        image_data = ImageOps.exif_transpose(Image.open(str(image_path)))
        for r in result:
            try:
                r['embedding'] = model.get_face_embedding(model.crop(image_data, r['box']))
            except ValueError:
                pass
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--classifier', required=True,
                        choices=['object', 'style', 'color', 'face'])
    parser.add_argument('--label', required=True, help='Result set name, e.g. baseline-tf')
    parser.add_argument('--images', nargs='+', default=['/srv/tests/photos/bench'])
    parser.add_argument('--runs', type=int, default=1, help='Timed runs per image')
    parser.add_argument('--out', default='/data/cache/benchmarks')
    args = parser.parse_args()

    setup_django()
    images = list_images(args.images)
    if not images:
        raise SystemExit('No images found')

    rss_start = rss_mb()
    load_started = time.monotonic()
    model = build_model(args.classifier)
    if hasattr(model, '_ensure_loaded'):
        model._ensure_loaded()
    load_seconds = time.monotonic() - load_started
    rss_after_load = rss_mb()

    import psutil
    process = psutil.Process()
    per_image = {}
    for image_path in images:
        times = []
        cpu_times = []
        result = None
        for _ in range(args.runs):
            cpu_before = process.cpu_times()
            started = time.monotonic()
            result = predict_one(args.classifier, model, image_path)
            times.append(round(time.monotonic() - started, 3))
            cpu_after = process.cpu_times()
            cpu_times.append(round((cpu_after.user + cpu_after.system)
                                   - (cpu_before.user + cpu_before.system), 3))
        per_image[image_path.name] = {
            'seconds': times,
            'cpu_seconds': cpu_times,
            'n_results': len(result) if result else 0,
            'result': normalise_result(args.classifier, result),
        }
        print(f'{args.classifier} {image_path.name}: {times} s wall, '
              f'{cpu_times} s cpu, '
              f'{per_image[image_path.name]["n_results"]} results', flush=True)

    report = {
        'classifier': args.classifier,
        'label': args.label,
        'env': {
            'cpu_count': os.cpu_count(),
            'python': sys.version.split()[0],
            'frameworks': framework_versions(),
        },
        'model_load_seconds': round(load_seconds, 3),
        'rss_start_mb': round(rss_start, 1),
        'rss_after_load_mb': round(rss_after_load, 1),
        'rss_end_mb': round(rss_mb(), 1),
        'peak_rss_mb': round(peak_rss_mb(), 1),
        'total_predict_seconds': round(sum(sum(v['seconds']) for v in per_image.values()), 3),
        'total_cpu_seconds': round(sum(sum(v['cpu_seconds']) for v in per_image.values()), 3),
        'images': per_image,
    }

    out_dir = Path(args.out) / args.label
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f'{args.classifier}.json'
    with open(out_file, 'w') as f:
        json.dump(report, f, indent=1)
    print(f'\nWrote {out_file}')
    print(f'load={report["model_load_seconds"]}s '
          f'predict_total={report["total_predict_seconds"]}s '
          f'peak_rss={report["peak_rss_mb"]}MB')


def framework_versions():
    versions = {}
    for module_name in ('tensorflow', 'onnxruntime'):
        if module_name in sys.modules:
            versions[module_name] = getattr(sys.modules[module_name], '__version__', '?')
    return versions


if __name__ == '__main__':
    main()
