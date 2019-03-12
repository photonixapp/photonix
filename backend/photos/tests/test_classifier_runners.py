from pathlib import Path

import pytest

# pytestmark = pytest.mark.django_db


@pytest.fixture
def photo_fixture_snow(db):
    from photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    return record_photo(snow_path)


@pytest.fixture
def photo_fixture_tree(db):
    from photos.utils.db import record_photo
    tree_path = str(Path(__file__).parent / 'photos' / 'tree.jpg')
    return record_photo(tree_path)


def test_color_via_runner(photo_fixture_snow):
    from classifiers.color.model import run_on_photo

    # Path on it's own returns a None Photo object along with the result
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo, result = run_on_photo(snow)

    assert photo is None
    assert len(result) == 7
    assert result[0][0] == 'Violet'
    assert '{0:.3f}'.format(result[0][1]) == '0.094'

    # Passing in a Photo object should tag the object
    assert photo_fixture_snow.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_snow.id)
    assert photo_fixture_snow.photo_tags.count() == 7
    assert photo_fixture_snow.photo_tags.all()[0].tag.name == 'Violet'
    assert photo_fixture_snow.photo_tags.all()[0].tag.type == 'C'
    assert '{0:.3f}'.format(photo_fixture_snow.photo_tags.all()[0].significance) == '0.094'


def test_location_via_runner(photo_fixture_tree):
    from classifiers.location.model import run_on_photo

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
    from classifiers.object.model import run_on_photo

    # Path on it's own returns a None Photo object along with the result
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo, result = run_on_photo(snow)

    assert photo is None
    assert len(result) == 2
    assert result[0]['label'] == 'Tree'
    assert '{0:.3f}'.format(result[0]['significance']) == '0.226'

    # Passing in a Photo object should tag the object
    assert photo_fixture_snow.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_snow.id)
    assert photo_fixture_snow.photo_tags.count() == 2
    assert photo_fixture_snow.photo_tags.all()[0].tag.name == 'Tree'
    assert photo_fixture_snow.photo_tags.all()[0].tag.type == 'O'
    assert '{0:.3f}'.format(photo_fixture_snow.photo_tags.all()[0].significance) == '0.226'


def test_style_via_runner(photo_fixture_snow):
    from classifiers.style.model import run_on_photo

    # Path on it's own returns a None Photo object along with the result
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo, result = run_on_photo(snow)

    assert photo is None
    assert len(result) == 1
    assert result[0][0] == 'serene'
    assert '{0:.3f}'.format(result[0][1]) == '0.915'

    # Passing in a Photo object should tag the object
    assert photo_fixture_snow.photo_tags.count() == 0
    photo, result = run_on_photo(photo_fixture_snow.id)
    assert photo_fixture_snow.photo_tags.count() == 1
    assert photo_fixture_snow.photo_tags.all()[0].tag.name == 'serene'
    assert photo_fixture_snow.photo_tags.all()[0].tag.type == 'S'
    assert '{0:.3f}'.format(photo_fixture_snow.photo_tags.all()[0].significance) == '0.915'
