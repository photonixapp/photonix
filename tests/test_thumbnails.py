import os
from pathlib import Path

from django.conf import settings
from django.test import Client
import pytest

from .factories import LibraryFactory
from photonix.photos.utils.thumbnails import get_thumbnail, get_thumbnail_path


@pytest.fixture
def photo_fixture_snow(db):
    from photonix.photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory()
    return record_photo(snow_path, library)


def test_generate_thumbnail(photo_fixture_snow):
    width, height, crop, quality, _, _ = settings.THUMBNAIL_SIZES[0]
    assert width == 256
    assert height == 256
    assert crop == 'cover'
    assert quality == 50

    # Should generate image thumbnail and return bytes as we specified in the return_type
    result = get_thumbnail(photo_fixture_snow.base_file.id, width=width, height=height, crop=crop, quality=quality, return_type='bytes')
    assert result[:10] == b'\xff\xd8\xff\xe0\x00\x10JFIF'

    # It should also have saved the thumbnail data down to disk
    path = get_thumbnail_path(photo_fixture_snow.base_file.id, width, height, crop, quality)
    assert os.path.exists(path)
    assert str(path).endswith(str(Path('cache') / 'thumbnails' / 'photofile' / '256x256_cover_q50' / '{}.jpg'.format(str(photo_fixture_snow.base_file.id))))
    assert len(result) == os.stat(path).st_size
    assert os.stat(path).st_size > 5929 * 0.8
    assert os.stat(path).st_size < 5929 * 1.2


def test_view(photo_fixture_snow):
    # Start with no thumbnail on disk
    width, height, crop, quality, _, _ = settings.THUMBNAIL_SIZES[0]
    path = get_thumbnail_path(photo_fixture_snow.base_file.id, width, height, crop, quality)
    assert not os.path.exists(path)

    # Make a web request to the thumbnail API
    client = Client()
    url = '/thumbnailer/photo/256x256_cover_q50/{}/'.format(photo_fixture_snow.id)
    response = client.get(url)

    # We should get a 302 redirect back
    assert response.status_code == 302
    assert response['Location'] == f'/thumbnails/photofile/256x256_cover_q50/{photo_fixture_snow.base_file.id}.jpg'

    # Follow the redirect
    url = response['Location']
    response = client.get(url)

    # Now we should get the actual thumbnail image file
    assert response.status_code == 200
    assert response.content[:10] == b'\xff\xd8\xff\xe0\x00\x10JFIF'
    assert response.headers['Content-Type'] == 'image/jpeg'
    response_length = len(response.content)
    assert response_length > 5929 * 0.8
    assert response_length < 5929 * 1.2

    # Thumbnail should be now on disk
    assert os.path.exists(path)

    # Now we check that if we make the same request again, the file on disk is used rather than re-generating
    # Modify the file by appending 4 bytes
    with open(path, 'a') as thumbfile:
        thumbfile.write('test')

    # Get and check the new file length
    response = client.get(url)
    assert len(response.content) == (response_length + 4)
    os.remove(path)
