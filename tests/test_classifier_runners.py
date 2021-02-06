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


def test_color_via_runner(photo_fixture_snow):
    from photonix.classifiers.color.model import run_on_photo

    # Path on it's own returns a None Photo object along with the result
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo, result = run_on_photo(snow)

    assert photo is None
    assert len(result) == 8
    assert result[0][0] == 'Azure'
    assert '{0:.3f}'.format(result[0][1]) == '0.891'

    # Passing in a Photo object should tag the object
    assert photo_fixture_snow.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_snow.id)
    assert photo_fixture_snow.photo_tags.count() == 8
    assert photo_fixture_snow.photo_tags.all()[0].tag.name == 'Azure'
    assert photo_fixture_snow.photo_tags.all()[0].tag.type == 'C'
    assert '{0:.3f}'.format(photo_fixture_snow.photo_tags.all()[0].significance) == '0.891'


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
    assert '{0:.3f}'.format(result[0][1]) == '0.962'

    # Passing in a Photo object should tag the object
    assert photo_fixture_snow.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_snow.id)
    assert photo_fixture_snow.photo_tags.count() == 1
    assert photo_fixture_snow.photo_tags.all()[0].tag.name == 'serene'
    assert photo_fixture_snow.photo_tags.all()[0].tag.type == 'S'
    assert '{0:.3f}'.format(photo_fixture_snow.photo_tags.all()[0].significance) == '0.962'
