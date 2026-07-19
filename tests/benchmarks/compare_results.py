#!/usr/bin/env python3
"""Compare two benchmark result sets produced by bench_classifiers.py.

    python compare_results.py /data/cache/benchmarks/baseline-tf /data/cache/benchmarks/tier0

Reports per-classifier timing and memory deltas plus output differences
(labels appearing/disappearing, score drift, face count and embedding
similarity) so a model change can be judged "at least as good as before".
"""
import json
import math
import sys
from pathlib import Path

SIGNIFICANT_SCORE = 0.4  # Labels at/above this score matter for tag parity


def load_results(result_dir):
    results = {}
    for path in sorted(Path(result_dir).glob('*.json')):
        with open(path) as f:
            results[path.stem] = json.load(f)
    return results


def median(values):
    ordered = sorted(values)
    n = len(ordered)
    return ordered[n // 2] if n % 2 else (ordered[n // 2 - 1] + ordered[n // 2]) / 2


def image_time(entry):
    return median(entry['seconds'])


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


def box_iou(a, b):
    # boxes are [x, y, w, h]
    ax1, ay1, ax2, ay2 = a[0], a[1], a[0] + a[2], a[1] + a[3]
    bx1, by1, bx2, by2 = b[0], b[1], b[0] + b[2], b[1] + b[3]
    ix = max(0, min(ax2, bx2) - max(ax1, bx1))
    iy = max(0, min(ay2, by2) - max(ay1, by1))
    inter = ix * iy
    union = a[2] * a[3] + b[2] * b[3] - inter
    return inter / union if union else 0.0


def labels_of(classifier, result, min_score=SIGNIFICANT_SCORE):
    if not result:
        return set()
    if classifier == 'object':
        return {r['label'] for r in result if r['score'] >= min_score}
    if classifier == 'face':
        return set()
    return {label for label, score in result if score >= min_score}


def compare_outputs(classifier, images_a, images_b):
    diffs = []
    for name in sorted(set(images_a) & set(images_b)):
        result_a = images_a[name]['result']
        result_b = images_b[name]['result']
        if classifier == 'face':
            n_a, n_b = len(result_a or []), len(result_b or [])
            line = None
            if n_a != n_b:
                line = f'    {name}: faces {n_a} -> {n_b}'
            sims = []
            for face_a in result_a or []:
                best = max((f for f in result_b or []),
                           key=lambda f: box_iou(face_a['box'], f['box']), default=None)
                if best and box_iou(face_a['box'], best['box']) > 0.3:
                    if face_a.get('embedding') and best.get('embedding') \
                            and len(face_a['embedding']) == len(best['embedding']):
                        sims.append(cosine(face_a['embedding'], best['embedding']))
            if sims and min(sims) < 0.999:
                extra = f'    {name}: min matched-face embedding cosine {min(sims):.4f}'
                line = f'{line}\n{extra}' if line else extra
            if line:
                diffs.append(line)
        else:
            set_a = labels_of(classifier, result_a)
            set_b = labels_of(classifier, result_b)
            lost, gained = set_a - set_b, set_b - set_a
            if lost or gained:
                diffs.append(f'    {name}: lost={sorted(lost) or "-"} gained={sorted(gained) or "-"}')
    return diffs


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    results_a = load_results(sys.argv[1])
    results_b = load_results(sys.argv[2])
    label_a = Path(sys.argv[1]).name
    label_b = Path(sys.argv[2]).name

    for classifier in sorted(set(results_a) & set(results_b)):
        a, b = results_a[classifier], results_b[classifier]
        time_a = sum(image_time(v) for v in a['images'].values())
        time_b = sum(image_time(v) for v in b['images'].values())
        speedup = time_a / time_b if time_b else float('inf')
        print(f'\n== {classifier} ({label_a} -> {label_b}) ==')
        print(f'  predict total: {time_a:.2f}s -> {time_b:.2f}s  ({speedup:.2f}x)')
        print(f'  model load:    {a["model_load_seconds"]:.2f}s -> {b["model_load_seconds"]:.2f}s')
        print(f'  peak RSS:      {a["peak_rss_mb"]:.0f}MB -> {b["peak_rss_mb"]:.0f}MB')
        print(f'  RSS after load:{a["rss_after_load_mb"]:.0f}MB -> {b["rss_after_load_mb"]:.0f}MB')
        diffs = compare_outputs(classifier, a['images'], b['images'])
        if diffs:
            print(f'  output differences (labels with score >= {SIGNIFICANT_SCORE}):')
            print('\n'.join(diffs))
        else:
            print('  outputs: no significant differences')

    only_a = set(results_a) - set(results_b)
    only_b = set(results_b) - set(results_a)
    if only_a:
        print(f'\nOnly in {label_a}: {sorted(only_a)}')
    if only_b:
        print(f'\nOnly in {label_b}: {sorted(only_b)}')


if __name__ == '__main__':
    main()
