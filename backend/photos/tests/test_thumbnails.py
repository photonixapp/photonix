import os
from pathlib import Path

from django.conf import settings
import pytest

from photos.utils.thumbnails import get_thumbnail, get_thumbnail_path


@pytest.fixture
def photo_fixture_snow(db):
    from photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    return record_photo(snow_path)


def test_generate_thumbnail(photo_fixture_snow):
    width, height, crop, quality, _ = settings.THUMBNAIL_SIZES[0]
    assert width == 256
    assert height == 256
    assert crop == 'cover'
    assert quality == 50

    # Should generate image thumbnail and return bytes as we specified in the return_type
    result = get_thumbnail(photo_fixture_snow.id, width, height, crop, quality, return_type='bytes')
    assert result[:10] == b'\xff\xd8\xff\xe0\x00\x10JFIF'

    # It should also have saved the thumbnail data down to disk
    path = get_thumbnail_path(photo_fixture_snow, width, height, crop, quality)
    assert os.path.exists(path)
    assert path.endswith(str(Path('cache') / 'thumbnails' / '256x256_cover_q50' / '{}.jpg'.format(str(photo_fixture_snow))))
    assert len(result) == os.stat(path).st_size
    assert os.stat(path).st_size > 5929 * 0.8
    assert os.stat(path).st_size < 5929 * 1.2
