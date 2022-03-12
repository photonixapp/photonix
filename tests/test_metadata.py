from pathlib import Path

from photonix.photos.utils.metadata import PhotoMetadata, parse_gps_location, get_datetime


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
    assert parsed_datetime.isoformat() == '2021-09-02T10:43:49.739248+00:00'
