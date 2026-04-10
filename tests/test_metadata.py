import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest

from photonix.photos.utils.db import record_photo
from photonix.photos.utils.metadata import PhotoMetadata, parse_gps_location, get_datetime
from .factories import LibraryFactory


def test_metadata():
    # General EXIF metadata
    photo_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    metadata = PhotoMetadata(photo_path)
    assert metadata.get('Image Size') == '800x600'
    assert metadata.get('Date Time') == '2018:02:28 07:16:25'
    assert metadata.get('Make') == 'Xiaomi'
    assert metadata.get('ISO') == '100'

    # Ignore invalid UTF-8 that might be in the metadata
    photo_path = str(Path(__file__).parent / 'photos' / 'invalid_utf8.jpg')
    metadata = PhotoMetadata(photo_path)
    assert len(metadata.get_all().keys()) > 30
    assert metadata.get('Artist') == ''


def test_location():
    # Conversion from GPS exif data to latitude/longitude
    gps_position = '64 deg 9\' 0.70" N, 21 deg 56\' 3.47" W'
    latitude, longitude = parse_gps_location(gps_position)
    assert latitude == 64.15011666666668
    assert longitude == -21.933911666666667


def test_datetime():
    # Data from exif metadata
    photo_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    parsed_datetime = get_datetime(photo_path)
    assert parsed_datetime.year == 2018
    assert parsed_datetime.isoformat() == '2018-02-28T07:16:25+00:00'

    # Date extraction from filename
    photo_path = str(Path(__file__).parent / 'photos' / 'snow-1999-12-31.jpg')
    parsed_datetime = get_datetime(photo_path)
    assert parsed_datetime.isoformat() == '1999-12-31T00:00:00'

    photo_path = str(Path(__file__).parent / 'photos' / 'snow-20100603.jpg')
    parsed_datetime = get_datetime(photo_path)
    assert parsed_datetime.isoformat() == '2010-06-03T00:00:00'

    # Date is parseable but has slashes instead of colons
    photo_path = str(Path(__file__).parent / 'photos' / 'bad_date.jpg')
    parsed_datetime = get_datetime(photo_path)
    assert parsed_datetime.year == 2000
    assert parsed_datetime.isoformat() == '2000-01-01T00:00:00+00:00'

    # Some of the date digits are the letter X so fall back to file creation date
    photo_path = str(Path(__file__).parent / 'photos' / 'unreadable_date.jpg')
    parsed_datetime = get_datetime(photo_path)
    # Falls back to file ctime, so just verify it's a valid datetime
    # and not the unreadable EXIF date
    file_ctime = datetime.fromtimestamp(os.stat(photo_path).st_ctime, tz=timezone.utc)
    assert parsed_datetime == file_ctime


@pytest.mark.django_db
def test_duplicate_date_photos():
    """Photos with same date should not be treated as duplicates (fix #347)."""
    library = LibraryFactory()
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    with tempfile.TemporaryDirectory() as tmp_dir:
        path_photo1 = os.path.join(tmp_dir, 'photo_no_metadata_1.jpg')
        path_photo2 = os.path.join(tmp_dir, 'photo_no_metadata_2.jpg')
        shutil.copy2(snow_path, path_photo1)
        shutil.copy2(snow_path, path_photo2)

        photo1 = record_photo(path_photo1, library)
        photo2 = record_photo(path_photo2, library)

        assert photo1 != photo2
