from datetime import datetime
from pathlib import Path
import queue
import threading
from time import time
import uuid

from django.utils import timezone
import factory
import pytest

from photonix.classifiers.color import ColorModel, run_on_photo
from photonix.classifiers.style import StyleModel, run_on_photo
from photonix.photos.models import Task, Photo, PhotoFile, Tag, PhotoTag
from photonix.photos.utils.classification import ThreadedQueueProcessor


# pytestmark = pytest.mark.django_db


model = StyleModel()


@pytest.fixture
def photo_fixture_snow(db):
    from photonix.photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    return record_photo(snow_path)


class PhotoFileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PhotoFile

    path                = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    mimetype            = 'image/jpeg'
    bytes               = 1000
    file_modified_at    = timezone.now()


class PhotoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Photo


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    type = 'classify.style'
    status = 'P'


def test_classifier_batch(photo_fixture_snow):
    photo = PhotoFactory()
    PhotoFileFactory(photo=photo)

    for i in range(4):
        TaskFactory(subject_id=photo.id)

    start = time()

    threaded_queue_processor = ThreadedQueueProcessor(model, 'classify.style', run_on_photo, 1, 64)
    threaded_queue_processor.run(loop=False)

    assert time() - start > 0
    assert time() - start < 100
    assert photo.photo_tags.count() == 1
    assert photo.photo_tags.all()[0].tag.name == 'serene'
    assert photo.photo_tags.all()[0].confidence > 0.9
