"""Compact binary dataset for the location classifier's city lookup.

This module replaces the 22 MB GeoNames ``cities1000.txt`` TSV (of which the
classifier only ever reads five columns) with a single compact ``cities.bin``
artifact (~4.5 MB) that can be loaded straight into NumPy arrays and searched
vectorised.

It intentionally depends on **stdlib + numpy only** and imports nothing from
the rest of Photonix, so ``scripts/build_location_cities.py`` can load it
directly (bypassing the ``photonix.classifiers.location`` package ``__init__``)
without pulling in Django / matplotlib / shapefile.

Binary format (``cities.bin``)
------------------------------
Little-endian throughout. Records are stored in original TSV file order.

Header (20 bytes, ``struct`` layout ``<8sIII``)::

    magic       8 bytes   b'PHXCITY\\x00'
    version     uint32    format version (currently 1)
    count       uint32    N, the number of city records
    code_width  uint32    W, fixed byte width of the country-code field

Then the following contiguous blocks, each holding ``N`` records (except the
final name blob):

    col4        float64[N]      exact ``float(row[4])`` of each TSV row
    col5        float64[N]      exact ``float(row[5])`` of each TSV row
    population  int32[N]        ``int(row[14])``
    codes       uint8[N * W]    country codes (``row[8]``) as UTF-8 bytes,
                                right null-padded to width W
    name_len    uint16[N]       UTF-8 byte length of each city name
    name_blob   uint8[sum]      concatenated UTF-8 city names (``row[1]``)

Only these five source columns are preserved because they are the only ones the
classifier reads: ``row[1]`` (name), ``row[4]`` / ``row[5]`` (the coordinate
columns, fed to the haversine exactly as the original code did), ``row[8]``
(country code) and ``row[14]`` (population). ``col4`` / ``col5`` are stored as
float64 so that ``float(row[4])`` / ``float(row[5])`` round-trip bit-for-bit,
keeping the haversine distances — and therefore predictions — identical.
"""

import csv
import struct

import numpy as np


MAGIC = b'PHXCITY\x00'
FORMAT_VERSION = 1
_HEADER_STRUCT = struct.Struct('<8sIII')


class CityData:
    """In-memory columnar view of the cities dataset used by ``get_city``.

    ``col4`` / ``col5`` deliberately keep the original (doubly-swapped)
    coordinate-column semantics of the source data; they are named after the
    TSV column index rather than lat/lon to avoid implying a fixed orientation.
    """

    __slots__ = ('names', 'col4', 'col5', 'codes', 'populations')

    def __init__(self, names, col4, col5, codes, populations):
        self.names = names              # list[str], length N
        self.col4 = col4                # np.float64[N]  == float(row[4])
        self.col5 = col5                # np.float64[N]  == float(row[5])
        self.codes = codes              # np.ndarray(dtype=object) of str, length N
        self.populations = populations  # np.int64[N]

    def __len__(self):
        return len(self.names)


def parse_cities_tsv(cities_file):
    """Parse ``cities1000.txt`` into a list of rows (list of str columns).

    This mirrors the original ``LocationModel.load_cities`` parsing exactly and
    is kept so tests (and the offline build) can reproduce the pre-binary code
    path faithfully.
    """
    rows = []
    with open(cities_file, newline='') as csvfile:
        reader = csv.reader(csvfile, delimiter='\t')
        for row in reader:
            rows.append(row)
    return rows


def city_data_from_rows(rows):
    """Build a :class:`CityData` from raw TSV-style rows (list of lists)."""
    names = [row[1] for row in rows]
    col4 = np.array([float(row[4]) for row in rows], dtype=np.float64)
    col5 = np.array([float(row[5]) for row in rows], dtype=np.float64)
    codes = np.array([row[8] for row in rows], dtype=object)
    populations = np.array([int(row[14]) for row in rows], dtype=np.int64)
    return CityData(names, col4, col5, codes, populations)


def build_cities_bin(rows, out_path):
    """Serialise TSV-style ``rows`` to the compact ``cities.bin`` format."""
    n = len(rows)

    col4 = np.array([float(row[4]) for row in rows], dtype='<f8')
    col5 = np.array([float(row[5]) for row in rows], dtype='<f8')

    populations = [int(row[14]) for row in rows]
    if populations and (min(populations) < np.iinfo(np.int32).min
                        or max(populations) > np.iinfo(np.int32).max):
        raise ValueError('Population value does not fit in int32')
    pop = np.array(populations, dtype='<i4')

    code_bytes = [row[8].encode('utf-8') for row in rows]
    code_width = max((len(b) for b in code_bytes), default=1)
    codes = np.zeros((n, code_width), dtype=np.uint8)
    for i, b in enumerate(code_bytes):
        codes[i, :len(b)] = np.frombuffer(b, dtype=np.uint8)

    name_bytes = [row[1].encode('utf-8') for row in rows]
    name_len_list = [len(b) for b in name_bytes]
    if name_len_list and max(name_len_list) > np.iinfo(np.uint16).max:
        raise ValueError('City name is too long to encode with uint16 length')
    name_len = np.array(name_len_list, dtype='<u2')
    name_blob = b''.join(name_bytes)

    header = _HEADER_STRUCT.pack(MAGIC, FORMAT_VERSION, n, code_width)
    with open(out_path, 'wb') as f:
        f.write(header)
        f.write(col4.tobytes())
        f.write(col5.tobytes())
        f.write(pop.tobytes())
        f.write(codes.tobytes())
        f.write(name_len.tobytes())
        f.write(name_blob)


def build_from_tsv(tsv_path, out_path):
    """Convenience: parse a ``cities1000.txt`` and write ``cities.bin``."""
    rows = parse_cities_tsv(tsv_path)
    build_cities_bin(rows, out_path)
    return len(rows)


def load_cities_bin(cities_file):
    """Load a ``cities.bin`` artifact into a :class:`CityData`."""
    with open(cities_file, 'rb') as f:
        data = f.read()

    magic, version, n, code_width = _HEADER_STRUCT.unpack_from(data, 0)
    if magic != MAGIC:
        raise ValueError('Not a Photonix cities.bin file (bad magic)')
    if version != FORMAT_VERSION:
        raise ValueError('Unsupported cities.bin format version: {}'.format(version))

    offset = _HEADER_STRUCT.size
    col4 = np.array(np.frombuffer(data, dtype='<f8', count=n, offset=offset), dtype=np.float64)
    offset += 8 * n
    col5 = np.array(np.frombuffer(data, dtype='<f8', count=n, offset=offset), dtype=np.float64)
    offset += 8 * n
    populations = np.frombuffer(data, dtype='<i4', count=n, offset=offset).astype(np.int64)
    offset += 4 * n
    code_flat = np.frombuffer(data, dtype=np.uint8, count=n * code_width, offset=offset)
    offset += n * code_width
    name_len = np.frombuffer(data, dtype='<u2', count=n, offset=offset)
    offset += 2 * n
    name_blob = data[offset:]

    # Country codes: decode the fixed-width block in one pass, strip null pad.
    code_text = code_flat.tobytes().decode('utf-8')
    codes = np.array(
        [code_text[i * code_width:(i + 1) * code_width].rstrip('\x00') for i in range(n)],
        dtype=object,
    )

    names = []
    pos = 0
    for length in name_len.tolist():
        names.append(name_blob[pos:pos + length].decode('utf-8'))
        pos += length

    return CityData(names, col4, col5, codes, populations)
