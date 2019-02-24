from pathlib import Path

from django.utils import timezone
import pytest

from photos.models import Task
from photos.utils.raw import process_ensure_jpeg_exists_tasks

# pytestmark = pytest.mark.django_db


@pytest.fixture
def photo_fixture_snow(db):
    from photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    return record_photo(snow_path)


def test_tasks_created_updated(photo_fixture_snow):
    # Task should have been created for the fixture
    task = Task.objects.get(type='ensure_jpeg_exists', status='P', subject_id=photo_fixture_snow.id)
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None

    # Test manually starting makes intended changes
    task.start()
    assert task.status == 'S'
    assert (timezone.now() - task.started_at).seconds < 1

    # Undo last changes
    task.status = 'P'
    task.started_at = None
    task.save()

    # Calling this function should complete the task and queue up a new one for generating thumbnails
    process_ensure_jpeg_exists_tasks()
    task = Task.objects.get(type='ensure_jpeg_exists', subject_id=photo_fixture_snow.id)
    assert task.status == 'C'
    assert (timezone.now() - task.started_at).seconds < 1
    assert (timezone.now() - task.finished_at).seconds < 1

    # Check next task has been created
    task = Task.objects.get(type='generate_thumbnails', subject_id=photo_fixture_snow.id)
    assert task.status == 'P'
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None
