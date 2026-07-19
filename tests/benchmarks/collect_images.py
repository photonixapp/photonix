#!/usr/bin/env python3
"""Collect the benchmark image set into tests/photos/bench/.

The set mixes large real photos (picsum.photos, Unsplash-sourced) that
exercise full-resolution inference cost, the small repo fixtures, and a
deterministic multi-face collage built from the LFW fixtures in
tests/photos/faces/ so face-detection recall can be compared across model
changes against a known face count.

Idempotent: files that already exist are skipped. Run on the host (the
bench dir is bind-mounted into the container read-only for uid 2000).
"""
import io
import shutil
import sys
from pathlib import Path

import requests
from PIL import Image

TESTS_DIR = Path(__file__).resolve().parent.parent
BENCH_DIR = TESTS_DIR / 'photos' / 'bench'
FACES_DIR = TESTS_DIR / 'photos' / 'faces'

# Large photos from picsum.photos (stable numeric ids map to fixed photos).
# Sizes chosen to approximate real camera output (8-12 MP).
PICSUM_IMAGES = [
    # (filename, picsum id, width, height)
    ('picsum_237_dog_4000.jpg', 237, 4000, 2667),
    ('picsum_1025_pug_3000.jpg', 1025, 3000, 2000),
    ('picsum_1084_3800.jpg', 1084, 3800, 2500),
    ('picsum_1074_3200.jpg', 1074, 3200, 2100),
    ('picsum_1080_2800.jpg', 1080, 2800, 1900),
    ('picsum_1000_5000.jpg', 1000, 5000, 3333),
]

REPO_FIXTURES = ['snow.jpg', 'tree.jpg']

# (face file, scale factor, x, y) on a 4000x3000 canvas. LFW crops are
# 250x250. Scales chosen to give a mix of small and large faces.
COLLAGE_FACES = [
    ('Barbara_Becker_0001.jpg', 1.0, 200, 300),
    ('Boris_Becker_0003.jpg', 2.0, 900, 200),
    ('David_Beckham_0001.jpg', 3.0, 1700, 400),
    ('Boris_Becker_0004.jpg', 1.5, 3000, 500),
    ('David_Beckham_0002.jpg', 2.5, 500, 1600),
    ('Boris_Becker_0005.jpg', 1.2, 1900, 1800),
    ('David_Beckham_0010.jpg', 2.0, 2900, 1700),
]
COLLAGE_FILE = 'faces_collage_7_4000.jpg'
COLLAGE_FACE_COUNT = len(COLLAGE_FACES)


def download_picsum():
    for filename, picsum_id, width, height in PICSUM_IMAGES:
        dest = BENCH_DIR / filename
        if dest.exists():
            print(f'exists  {dest.name}')
            continue
        url = f'https://picsum.photos/id/{picsum_id}/{width}/{height}.jpg'
        print(f'fetch   {url}')
        response = requests.get(url, timeout=120, allow_redirects=True)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content))
        if image.size != (width, height):
            print(f'  warning: got size {image.size}, expected {(width, height)}')
        image.convert('RGB').save(dest, 'JPEG', quality=90)
        print(f'saved   {dest.name} ({dest.stat().st_size // 1024} KB)')


def copy_fixtures():
    for name in REPO_FIXTURES:
        dest = BENCH_DIR / name
        if dest.exists():
            print(f'exists  {dest.name}')
            continue
        shutil.copy(TESTS_DIR / 'photos' / name, dest)
        print(f'copied  {name}')


def build_collage():
    dest = BENCH_DIR / COLLAGE_FILE
    if dest.exists():
        print(f'exists  {dest.name}')
        return
    canvas = Image.new('RGB', (4000, 3000))
    # Simple deterministic vertical gradient background
    for y in range(3000):
        shade = 120 + int(80 * y / 3000)
        canvas.paste(Image.new('RGB', (4000, 1), (shade, shade, shade + 10)), (0, y))
    for face_file, scale, x, y in COLLAGE_FACES:
        face = Image.open(FACES_DIR / face_file).convert('RGB')
        size = int(250 * scale)
        face = face.resize((size, size), Image.Resampling.BICUBIC)
        canvas.paste(face, (x, y))
    canvas.save(dest, 'JPEG', quality=90)
    print(f'built   {dest.name} ({COLLAGE_FACE_COUNT} faces)')


if __name__ == '__main__':
    BENCH_DIR.mkdir(parents=True, exist_ok=True)
    copy_fixtures()
    build_collage()
    download_picsum()
    files = sorted(BENCH_DIR.iterdir())
    total_kb = sum(f.stat().st_size for f in files) // 1024
    print(f'\n{len(files)} files, {total_kb // 1024} MB in {BENCH_DIR}')
    sys.exit(0)
