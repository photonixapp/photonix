from datetime import datetime
import os
from pathlib import Path
import tempfile
import time

import pytest


class TestClassifierModels:
    def test_downloading(self):
        from classifiers.style.model import StyleModel

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

    def test_location_predict(self):
        from classifiers.location.model import LocationModel

        model = LocationModel()

        # London, UK - Tests multiple polygons of the UK
        result = model.predict(location=[51.5304213, -0.1286445])
        assert result['country']['name'] == 'United Kingdom'
        assert result['city']['name'] == 'London'
        assert result['city']['distance'] == 1405
        assert result['city']['population'] == 7556900

        # In the sea near Oia, Santorini, Greece - Country is inferred from city
        result = model.predict(location=[36.4396445,25.3560936])
        assert result['country']['name'] == 'Greece'
        assert result['city']['name'] == 'Oía'
        assert result['city']['distance'] == 3132
        assert result['city']['population'] == 3376

        # Too far off the coast of John o' Groats, Scotland, UK - No match
        result = model.predict(location=[58.6876742,-3.4206862])
        assert result['country'] == None
        assert result['city'] == None

        # Vernier, Switzerland - Tests country code mainly (CH can be China in some codings)
        result = model.predict(location=[46.1760906,5.9929043])
        assert result['country']['name'] == 'Switzerland'
        assert result['country']['code'] == 'CH'
        assert result['city']['country_name'] == 'Switzerland'
        assert result['city']['country_code'] == 'CH'

        # In France but close to a 'city' in Belgium - City should be limited to within border of country
        result = model.predict(location=[51.074323, 2.547278])
        assert result['country']['name'] == 'France'
        assert result['city']['country_name'] == 'France'
        assert result['city']['name'] == 'Téteghem'

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
