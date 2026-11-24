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


@pytest.fixture
def photo_fixture_large(db, tmp_path):
    from PIL import Image
    from photonix.photos.utils.db import record_photo
    path = tmp_path / 'large.jpg'
    Image.new('RGB', (4000, 3000), (200, 80, 40)).save(path, format='JPEG')
    return record_photo(str(path), LibraryFactory())


@pytest.mark.parametrize('width,height,crop,accurate,expected_size', [
    (256, 256, 'cover', True, (256, 256)),
    (256, 256, 'cover', False, (256, 256)),
    (1920, 1920, 'contain', True, (1920, 1440)),
    (1920, 1920, 'contain', False, (1920, 1440)),
])
def test_large_jpeg_sizes(photo_fixture_large, width, height, crop, accurate, expected_size):
    from PIL import Image
    # Make sure we generate rather than return a thumbnail left over from an earlier run
    existing = get_thumbnail_path(photo_fixture_large.base_file.id, width, height, crop, 50)
    if os.path.exists(existing):
        os.remove(existing)
    path = get_thumbnail(photo=photo_fixture_large, width=width, height=height, crop=crop, quality=50, force_accurate=accurate)
    with Image.open(path) as im:
        assert im.size == expected_size


def test_draft_reduces_decode_size(photo_fixture_large, monkeypatch):
    from PIL import Image, JpegImagePlugin
    from photonix.photos.utils import thumbnails

    drafts = []
    resized = []
    orig_draft = JpegImagePlugin.JpegImageFile.draft
    orig_resize = thumbnails.srgbResize

    def spy_draft(self, mode, size):
        result = orig_draft(self, mode, size)
        drafts.append((mode, size, self.size))
        return result

    def spy_resize(im, *args, **kwargs):
        resized.append(im.size)
        return orig_resize(im, *args, **kwargs)

    monkeypatch.setattr(JpegImagePlugin.JpegImageFile, 'draft', spy_draft)
    monkeypatch.setattr(thumbnails, 'srgbResize', spy_resize)

    existing = get_thumbnail_path(photo_fixture_large.base_file.id, 256, 256, 'cover', 50)
    if os.path.exists(existing):
        os.remove(existing)
    get_thumbnail(photo=photo_fixture_large, width=256, height=256, crop='cover', quality=50, force_accurate=True)

    # Draft was requested at 2x the output size, before pixels were loaded, and the JPEG decoder
    # scaled the 4000x3000 original down to something still >= 512 in both dimensions
    assert drafts[0][:2] == ('RGB', (512, 512))
    assert drafts[0][2] != (4000, 3000)
    assert resized[0] == drafts[0][2]
    assert resized[0][0] < 4000 and resized[0][1] < 3000
    assert resized[0][0] >= 512 and resized[0][1] >= 512
