from pathlib import Path

import pytest

from .factories import LibraryFactory


# pytestmark = pytest.mark.django_db


@pytest.fixture
def photo_fixture_snow(db):
    from photonix.photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory()
    return record_photo(snow_path, library)


@pytest.fixture
def photo_fixture_tree(db):
    from photonix.photos.utils.db import record_photo
    tree_path = str(Path(__file__).parent / 'photos' / 'tree.jpg')
    library = LibraryFactory()
    return record_photo(tree_path, library)


def test_face_via_runner_on_rotated_photo(db, tmp_path):
    # Face bounding boxes are detected on the EXIF-rotated image so the
    # stored positions must be relative to the displayed orientation and
    # the embedding crops must come from the rotated bitmap
    from PIL import Image
    from photonix.classifiers.face.model import run_on_photo
    from photonix.classifiers.model_manager import LAST_MODEL_LOAD_KEY
    from photonix.photos.utils.db import record_photo
    from photonix.photos.utils.redis import redis_connection

    # Portrait canvas (400x800) with a face near the top, stored rotated
    # 90 degrees with EXIF orientation 6 so viewers show it upright
    display = Image.new('RGB', (400, 800), (255, 255, 255))
    face = Image.open(Path(__file__).parent / 'photos' / 'faces' / 'Boris_Becker_0003.jpg')
    display.paste(face, (75, 50))  # Face box centre approx (200, 175)
    stored = display.rotate(90, expand=True)
    exif = Image.Exif()
    exif[0x0112] = 6
    path = str(tmp_path / 'rotated_face.jpg')
    stored.save(path, exif=exif, quality=95)

    library = LibraryFactory()
    photo = record_photo(path, library)
    assert photo.base_file.exif_rotation == 90

    # Clear model load cooldown so this test doesn't depend on test ordering
    redis_connection.delete(LAST_MODEL_LOAD_KEY)
    try:
        photo, results = run_on_photo(photo.id)
    finally:
        redis_connection.delete(LAST_MODEL_LOAD_KEY)

    assert len(results) == 1
    photo_tag = photo.photo_tags.get(tag__type='F')
    # Face centre is at approx (0.5, 0.22) of the displayed orientation.
    # Normalizing by pre-rotation dimensions would put it at (0.25, 0.43).
    assert 0.4 < photo_tag.position_x < 0.6
    assert 0.1 < photo_tag.position_y < 0.35
    # A tag that already exists with a different parent/ordering must be
    # returned rather than attempting an INSERT that violates the
    # (library, name, type, source) unique constraint and retrying forever
    from photonix.classifiers.runners import get_or_create_tag
    from photonix.photos.models import Tag

    library = LibraryFactory()
    parent = Tag.objects.create(library=library, name='Greece', type='L', source='C')
    tag = get_or_create_tag(library=library, name='Athens', type='L', source='C', parent=parent)
    assert tag.parent == parent

    tag2 = get_or_create_tag(library=library, name='Athens', type='L', source='C', parent=None, ordering=5)
    assert tag2 == tag
    assert Tag.objects.filter(library=library, name='Athens', type='L', source='C').count() == 1


def test_color_via_runner(photo_fixture_snow):
    from photonix.classifiers.color.model import run_on_photo

    # Path on it's own returns a None Photo object along with the result
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo, result = run_on_photo(snow)

    assert photo is None
    assert len(result) == 5
    assert result[0][0] == 'Azure'
    assert '{0:.3f}'.format(result[0][1]) == '0.826'

    # Passing in a Photo object should tag the object
    assert photo_fixture_snow.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_snow.id)
    assert photo_fixture_snow.photo_tags.count() == 5
    assert photo_fixture_snow.photo_tags.all()[0].tag.name == 'Azure'
    assert photo_fixture_snow.photo_tags.all()[0].tag.type == 'C'
    assert '{0:.3f}'.format(photo_fixture_snow.photo_tags.all()[0].significance) == '0.826'


def test_location_via_runner(photo_fixture_tree):
    from photonix.classifiers.location.model import run_on_photo

    # Path on it's own returns a None Photo object along with the result
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo, result = run_on_photo(snow)

    # This photo has no GPS coordinates
    assert photo is None
    assert result['city'] is None
    assert result['country'] is None

    # Path which does have GPS coordinates
    tree = str(Path(__file__).parent / 'photos' / 'tree.jpg')
    photo, result = run_on_photo(tree)
    assert result['country']['name'] == 'Greece'
    assert result['country']['code'] == 'GR'
    assert result['city']['name'] == 'Firá'
    assert result['city']['country_name'] == 'Greece'

    # Photo object with location to tag should have tags for country and city
    assert photo_fixture_tree.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_tree.id)
    assert photo.photo_tags.all().count() == 2
    assert photo.photo_tags.all()[0].tag.name == 'Greece'
    assert photo.photo_tags.all()[0].confidence == 1.0
    assert photo.photo_tags.all()[0].significance == 1.0
    assert photo.photo_tags.all()[1].tag.name == 'Firá'
    assert photo.photo_tags.all()[1].confidence == 0.5
    assert photo.photo_tags.all()[1].significance == 0.5
    assert photo.photo_tags.all()[1].tag.parent.name == 'Greece'


def test_object_via_runner(photo_fixture_snow):
    from photonix.classifiers.object.model import run_on_photo

    # Path on it's own returns a None Photo object along with the result
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo, result = run_on_photo(snow)

    assert photo is None
    assert len(result) == 3
    assert result[0]['label'] == 'Tree'
    assert '{0:.3f}'.format(result[0]['significance']) == '0.134'

    # Passing in a Photo object should tag the object
    assert photo_fixture_snow.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_snow.id)
    assert photo_fixture_snow.photo_tags.count() == 3
    assert photo_fixture_snow.photo_tags.all()[0].tag.name == 'Tree'
    assert photo_fixture_snow.photo_tags.all()[0].tag.type == 'O'
    assert '{0:.3f}'.format(photo_fixture_snow.photo_tags.all()[0].significance) == '0.134'


def test_style_via_runner(photo_fixture_snow):
    from photonix.classifiers.style.model import run_on_photo

    # Path on it's own returns a None Photo object along with the result
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo, result = run_on_photo(snow)

    assert photo is None
    assert len(result) == 1
    assert result[0][0] == 'serene'
    # ONNX Runtime + PIL preprocessing (was 0.962 under TF); top-1 preserved
    assert '{0:.3f}'.format(result[0][1]) == '0.957'

    # Passing in a Photo object should tag the object
    assert photo_fixture_snow.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_snow.id)
    assert photo_fixture_snow.photo_tags.count() == 1
    assert photo_fixture_snow.photo_tags.all()[0].tag.name == 'serene'
    assert photo_fixture_snow.photo_tags.all()[0].tag.type == 'S'
    assert '{0:.3f}'.format(photo_fixture_snow.photo_tags.all()[0].significance) == '0.957'
