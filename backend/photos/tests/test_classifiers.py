import tempfile

from django.test import TestCase

from classifiers.style.model import StyleModel


class TestClassifiers(TestCase):
    def test_downloading(self):
        with tempfile.TemporaryDirectory() as model_dir:
            model = StyleModel(lock_name=None, model_dir=model_dir)
