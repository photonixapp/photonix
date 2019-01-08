from datetime import datetime
import os
from pathlib import Path
import tempfile
import time

import pytest


@pytest.fixture
def photo_fixture_snow():
    from photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    return record_photo(snow_path)


class TestClassifiers:
    @pytest.mark.skip('Offline')
    def test_downloading(self):
        with tempfile.TemporaryDirectory() as model_dir:
            start = time.mktime(datetime.now().timetuple())
            model = StyleModel(lock_name=None, model_dir=model_dir)

            graph_path = str(Path(model_dir) / 'style' / 'graph.pb')
            assert os.stat(graph_path).st_size > 1024 * 10 * 10
            assert os.stat(graph_path).st_mtime > start
            with open(str(Path(model_dir) / 'style' / 'version.txt')) as f:
                content = f.read()
                assert content.strip() == str(model.version)

    def test_color_predict(self):
        from classifiers.color.model import ColorModel

        model = ColorModel()
        snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
        result = model.predict(snow)

        assert len(result) == 7
        assert result[0][0] == 'Violet'
        assert '{0:.3f}'.format(result[0][1]) == '0.094'
        assert result[1][0] == 'Gray'
        assert '{0:.3f}'.format(result[1][1]) == '0.018'

    @pytest.mark.skip('Slow')
    def test_object_predict(self):
        from classifiers.object.model import ObjectModel

        model = ObjectModel()
        snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
        result = model.predict(snow)

        assert len(result) == 2

        assert result[0]['label'] == 'Tree'
        assert '{0:.3f}'.format(result[0]['score']) == '0.950'
        assert '{0:.3f}'.format(result[0]['significance']) == '0.226'
        assert '{0:.3f}'.format(result[0]['x']) == '0.791'
        assert '{0:.3f}'.format(result[0]['y']) == '0.394'
        assert '{0:.3f}'.format(result[0]['width']) == '0.341'
        assert '{0:.3f}'.format(result[0]['height']) == '0.700'

        assert result[1]['label'] == 'Tree'
        assert '{0:.3f}'.format(result[1]['score']) == '0.819'
        assert '{0:.3f}'.format(result[1]['significance']) == '0.035'

    def test_style_predict(self):
        from classifiers.style.model import StyleModel

        model = StyleModel()
        snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
        result = model.predict(snow)

        assert len(result) == 1
        assert result[0][0] == 'serene'
        assert '{0:.3f}'.format(result[0][1]) == '0.915'


    @pytest.mark.django_db
    def test_color_via_runner(self, photo_fixture_snow):
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

    @pytest.mark.skip('Slow')
    @pytest.mark.django_db
    def test_object_via_runner(self, photo_fixture_snow):
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

    @pytest.mark.django_db
    def test_style_via_runner(self, photo_fixture_snow):
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
