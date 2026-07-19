"""Tests for the compact cities.bin dataset used by the location classifier.

Covers:
  * building the binary from a synthetic TSV (including non-ASCII city names)
    and round-tripping every value through the loader, and
  * get_city() producing identical results whether the model is fed raw TSV
    rows (the legacy list-of-lists path) or a CityData loaded from the binary.
"""
import csv

from photonix.classifiers.location.cities_dataset import (
    build_from_tsv,
    load_cities_bin,
    parse_cities_tsv,
)


# GeoNames-style rows (15 columns). Only columns 1, 4, 5, 8 and 14 are used by
# the classifier. Names deliberately include non-ASCII characters.
SAMPLE_ROWS = [
    ['1', 'Zürich', 'Zurich', '', '47.36667', '8.55', 'P', 'PPLA', 'CH', '', 'ZH', '', '', '', '341730'],
    ['2', 'Águeda', 'Agueda', '', '40.57', '-8.44667', 'P', 'PPLA', 'PT', '', '', '', '', '', '14504'],
    ['3', 'São Paulo', 'Sao Paulo', '', '-23.5475', '-46.63611', 'P', 'PPLA', 'BR', '', '', '', '', '', '10021295'],
    ['4', 'Kryvyï Rih', 'Kryvyi Rih', '', '47.90966', '33.39433', 'P', 'PPLA', 'UA', '', '', '', '', '', '652380'],
    ['5', 'Nullville', 'Nullville', '', '47.367', '8.5501', 'P', 'PPL', 'CH', '', '', '', '', '', '0'],
]


def _write_tsv(path, rows):
    with open(path, 'w', newline='') as f:
        writer = csv.writer(f, delimiter='\t')
        for row in rows:
            writer.writerow(row)


def test_build_round_trips_synthetic_tsv(tmp_path):
    tsv = str(tmp_path / 'cities1000.txt')
    binary = str(tmp_path / 'cities.bin')
    _write_tsv(tsv, SAMPLE_ROWS)

    count = build_from_tsv(tsv, binary)
    assert count == len(SAMPLE_ROWS)

    data = load_cities_bin(binary)

    # Names (incl. non-ASCII) preserved in original file order
    assert data.names == [row[1] for row in SAMPLE_ROWS]

    for i, row in enumerate(SAMPLE_ROWS):
        # Coordinate columns round-trip bit-for-bit as float64
        assert float(data.col4[i]).hex() == float(row[4]).hex()
        assert float(data.col5[i]).hex() == float(row[5]).hex()
        assert str(data.codes[i]) == row[8]
        assert int(data.populations[i]) == int(row[14])


def _model_from_cities(cities, countries):
    """A LocationModel wired up just enough for get_city, no download/load."""
    from photonix.classifiers.location.model import LocationModel

    model = LocationModel.__new__(LocationModel)
    model._loaded = True
    model.world = []
    model.countries = countries
    model.cities = cities
    return model


def test_get_city_binary_matches_tsv(tmp_path):
    tsv = str(tmp_path / 'cities1000.txt')
    binary = str(tmp_path / 'cities.bin')
    _write_tsv(tsv, SAMPLE_ROWS)
    build_from_tsv(tsv, binary)

    rows = parse_cities_tsv(tsv)          # legacy list-of-lists path
    data = load_cities_bin(binary)        # numpy CityData path
    countries = {'CH': 'Switzerland', 'PT': 'Portugal', 'BR': 'Brazil', 'UA': 'Ukraine'}

    model_tsv = _model_from_cities(rows, countries)
    model_bin = _model_from_cities(data, countries)

    # Queries are (lon, lat, country_code). Coordinates are chosen against the
    # col4/col5 values (the classifier's doubly-swapped convention) so several
    # land right on a city; others miss or are country-filtered.
    queries = [
        (47.36667, 8.55, None),        # exact hit on Zürich
        (47.367, 8.5501, None),        # cluster: Nullville (pop 0) excluded -> Zürich
        (40.57, -8.44667, None),       # Águeda
        (-23.5475, -46.63611, None),   # São Paulo
        (0.0, 0.0, None),              # nothing within 10km -> None
        (47.36667, 8.55, 'CH'),        # country filter keeps CH cities
        (47.36667, 8.55, 'BR'),        # only far São Paulo -> None
        (47.90966, 33.39433, 'UA'),    # Kryvyï Rih under country filter
    ]

    for lon, lat, country_code in queries:
        expected = model_tsv.get_city(lon, lat, country_code)
        actual = model_bin.get_city(lon, lat, country_code)
        assert expected == actual, (lon, lat, country_code, expected, actual)

    # Sanity: the pop-0 exclusion and non-ASCII name really are exercised
    zurich = model_bin.get_city(47.367, 8.5501, None)
    assert zurich['name'] == 'Zürich'
    assert model_bin.get_city(47.36667, 8.55, 'BR') is None
