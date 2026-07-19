#!/usr/bin/env python3
"""Build the compact ``cities.bin`` artifact for the location classifier.

The location classifier historically shipped GeoNames ``cities1000.txt`` — a
~22 MB tab-separated file of which only five columns are ever read. This script
converts that TSV into a single compact binary (~4.5 MB) that the classifier can
memory-map straight into NumPy arrays and search vectorised, with no change to
prediction outputs.

Usage::

    scripts/build_location_cities.py path/to/cities1000.txt path/to/cities.bin

Dependencies: Python standard library + numpy only.

Binary format (``cities.bin``, little-endian, records in original file order)
-----------------------------------------------------------------------------
Header (20 bytes, struct ``<8sIII``): magic ``b'PHXCITY\\x00'``, uint32 format
version (1), uint32 record count N, uint32 country-code field width W. Then five
contiguous blocks: ``col4`` float64[N] (exact ``float(row[4])``), ``col5``
float64[N] (exact ``float(row[5])``), ``population`` int32[N] (``int(row[14])``),
``codes`` uint8[N*W] (``row[8]`` UTF-8, null-padded to W), ``name_len``
uint16[N] (UTF-8 byte length of each name) and ``name_blob`` (concatenated
UTF-8 city names ``row[1]``). The coordinate columns are stored as float64 so
that the parsed values round-trip bit-for-bit and haversine distances — hence
predictions — stay identical.

The authoritative implementation lives in
``photonix/classifiers/location/cities_dataset.py``; it is imported here
directly (by file path, so this stays a stdlib+numpy-only tool that doesn't drag
in Django / matplotlib / shapefile).
"""

import argparse
import os
import sys

# Import the stdlib+numpy-only dataset module directly, without triggering the
# photonix.classifiers.location package __init__ (which imports heavy deps).
_LOCATION_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'photonix', 'classifiers', 'location',
)
sys.path.insert(0, _LOCATION_DIR)
import cities_dataset  # noqa: E402


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('tsv_path', help='path to GeoNames cities1000.txt')
    parser.add_argument('out_path', help='path to write cities.bin')
    args = parser.parse_args(argv)

    count = cities_dataset.build_from_tsv(args.tsv_path, args.out_path)
    size = os.path.getsize(args.out_path)
    print('Wrote {} ({} cities, {:.2f} MB) from {}'.format(
        args.out_path, count, size / (1024 * 1024), args.tsv_path))


if __name__ == '__main__':
    main()
