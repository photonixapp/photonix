import threading
import time
import uuid
from pathlib import Path

from django.utils import timezone
import pytest

from .factories import LibraryFactory
from photonix.photos.models import Task
from photonix.photos.utils.classification import process_classify_images_tasks
from photonix.photos.utils.raw import ensure_raw_processing_tasks
from photonix.photos.utils.thumbnails import process_generate_thumbnails_tasks

# pytestmark = pytest.mark.django_db


@pytest.fixture
def photo_fixture_snow(db):
    from photonix.photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory()
    return record_photo(snow_path, library)


def _make_task(**kwargs):
    kwargs.setdefault('subject_id', uuid.uuid4())
    return Task.objects.create(**kwargs)


def test_tasks_created_updated(photo_fixture_snow):
    # Task should have been created for the fixture
    task = Task.objects.get(type='ensure_raw_processed', status='P', subject_id=photo_fixture_snow.id)
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None

    # Test claiming makes intended changes
    assert task.claim()
    assert task.status == 'S'
    assert (timezone.now() - task.started_at).seconds < 1

    # Undo last changes
    task.status = 'P'
    task.started_at = None
    task.save()

    # Calling this function should complete the task and queue up a new one for generating thumbnails
    ensure_raw_processing_tasks()
    task = Task.objects.get(type='ensure_raw_processed', subject_id=photo_fixture_snow.id)
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

    # Process tasks to generate thumbnails which should add new task for classification
    process_generate_thumbnails_tasks()
    task = Task.objects.get(type='generate_thumbnails', subject_id=photo_fixture_snow.id)
    assert task.status == 'C'
    assert (timezone.now() - task.started_at).seconds < 10
    assert (timezone.now() - task.finished_at).seconds < 1

    # Chekc next task has been added to classify images
    task = Task.objects.get(type='classify_images', subject_id=photo_fixture_snow.id)
    assert task.status == 'P'
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None

    # Processing the classification task should create child processes
    assert task.complete_with_children == False
    assert task.status == 'P'
    process_classify_images_tasks()
    task = Task.objects.get(type='classify_images', subject_id=photo_fixture_snow.id)
    assert task.status == 'S'
    assert task.children.count() == 7
    assert task.complete_with_children == True

    # Completing all the child processes should set the parent task to completed
    for child in task.children.all():
        assert child.status == 'P'
        assert child.claim()
        assert task.status == 'S'
        assert child.status == 'S'
        child.complete()
        assert child.status == 'C'
    task.refresh_from_db()
    assert task.status == 'C'


def test_failed_transition_is_atomic_and_never_clobbers_completion(db):
    # A claimed task can be marked Failed
    task = _make_task(type='generate_thumbnails')
    assert task.claim()
    task.failed()
    assert task.status == 'F'
    assert task.finished_at is not None

    # A concurrently Completed task must stay Completed - e.g. a slow worker
    # calling failed() after a requeued copy of the task already finished
    task = _make_task(type='generate_thumbnails')
    stale_copy = Task.objects.get(pk=task.pk)
    task.complete()
    assert task.status == 'C'
    stale_copy.failed('worker gave up late')
    stale_copy.refresh_from_db()
    assert stale_copy.status == 'C'


def test_task_claim_is_atomic(photo_fixture_snow):
    from photonix.photos.utils.raw import ensure_raw_processed

    # Two processor replicas fetch the same Pending task - only one may win
    task_a = Task.objects.get(type='ensure_raw_processed', subject_id=photo_fixture_snow.id)
    task_b = Task.objects.get(pk=task_a.pk)

    assert task_a.claim() is True
    assert task_a.status == 'S'
    assert task_a.started_at is not None
    assert task_b.claim() is False

    # The losing replica must skip the task rather than process it again
    ensure_raw_processed(task_b.subject_id, task_b)
    assert not Task.objects.filter(type='generate_thumbnails', subject_id=photo_fixture_snow.id).exists()


def test_no_classifier_tasks_created_for_disabled_classifiers(db):
    # Tasks for disabled classifiers would never be picked up by their
    # processor, leaving the parent classify_images task incomplete forever
    from photonix.photos.utils.db import record_photo

    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory(
        classification_color_enabled=False,
        classification_location_enabled=False,
        classification_style_enabled=False,
        classification_object_enabled=False,
        classification_face_enabled=False,
        classification_clip_enabled=False,
    )
    photo = record_photo(snow_path, library)
    task = _make_task(type='classify_images', subject_id=photo.id, library=library)

    process_classify_images_tasks()
    task.refresh_from_db()

    # Only the event classifier (left enabled by the factory default) gets a task
    child_types = set(task.children.values_list('type', flat=True))
    assert child_types == {'classify.event'}

    # Completing it must complete the parent - before the fix five orphaned
    # child tasks would have blocked it in Started status permanently
    for child in task.children.all():
        child.claim()
        child.complete()
    task.refresh_from_db()
    assert task.status == 'C'


def test_no_event_task_created_when_event_disabled(db):
    # The event classifier now has a per-library toggle too, so disabling it
    # (along with the others) must leave no child classification tasks at all.
    from photonix.photos.utils.db import record_photo

    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory(
        classification_color_enabled=False,
        classification_location_enabled=False,
        classification_style_enabled=False,
        classification_object_enabled=False,
        classification_face_enabled=False,
        classification_event_enabled=False,
        classification_clip_enabled=False,
    )
    photo = record_photo(snow_path, library)
    task = _make_task(type='classify_images', subject_id=photo.id, library=library)

    process_classify_images_tasks()
    task.refresh_from_db()

    # No classify.event task (nor any other classifier task) should exist
    assert not task.children.filter(type='classify.event').exists()
    assert task.children.count() == 0

    # With no children to wait on, the parent task completes immediately
    assert task.status == 'C'


def test_no_clip_task_created_when_clip_disabled(db):
    # The CLIP semantic-search analyzer has a per-library toggle; when it is
    # disabled no classify.clip task should be created (it would otherwise sit
    # Pending forever because no processor would pick it up).
    from photonix.photos.utils.db import record_photo

    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory(
        classification_color_enabled=False,
        classification_location_enabled=False,
        classification_style_enabled=False,
        classification_object_enabled=False,
        classification_face_enabled=False,
        classification_event_enabled=True,
        classification_clip_enabled=False,
    )
    photo = record_photo(snow_path, library)
    task = _make_task(type='classify_images', subject_id=photo.id, library=library)

    process_classify_images_tasks()
    task.refresh_from_db()

    child_types = set(task.children.values_list('type', flat=True))
    assert 'classify.clip' not in child_types
    # Event stays enabled here, so exactly one child (the event task) exists
    assert child_types == {'classify.event'}


def test_scheduler_processes_tasks_in_steady_state(db, monkeypatch):
    # The scheduler must attempt processing on every poll - gating it on the
    # remaining count changing meant pending tasks were never expanded once
    # the count settled (steady state)
    import uuid

    from photonix.photos.management.commands import classification_scheduler

    library = LibraryFactory()
    _make_task(type='classify_images', subject_id=uuid.uuid4(), library=library)

    process_calls = []
    monkeypatch.setattr(classification_scheduler, 'process_classify_images_tasks',
                        lambda: process_calls.append(1))

    def fake_sleep(seconds):
        if len(process_calls) >= 3 or fake_sleep.iterations >= 5:
            raise KeyboardInterrupt
        fake_sleep.iterations += 1
    fake_sleep.iterations = 0
    monkeypatch.setattr(classification_scheduler, 'sleep', fake_sleep)

    with pytest.raises(KeyboardInterrupt):
        classification_scheduler.Command().run_scheduler()

    # The pending count never changes across iterations so the old code
    # would only have processed once
    assert len(process_calls) >= 3


def test_sibling_completion_creates_single_downstream_chain(db):
    # A stale duplicate completion (e.g. two replicas racing) must not
    # re-complete tasks or create a second downstream task chain
    import uuid

    library = LibraryFactory()
    subject_id = uuid.uuid4()
    parent = _make_task(type='parent_task', subject_id=subject_id, complete_with_children=True, library=library)
    child_a = _make_task(type='child_task', subject_id=subject_id, parent=parent, library=library)
    child_b = _make_task(type='child_task', subject_id=subject_id, parent=parent, library=library)

    # Copy of child_b as a concurrent process would have fetched it
    stale_b = Task.objects.get(pk=child_b.pk)

    child_a.complete(next_type='downstream_task', next_subject_id=subject_id)
    parent.refresh_from_db()
    assert parent.status == 'P'

    child_b.complete(next_type='downstream_task', next_subject_id=subject_id)
    parent.refresh_from_db()
    assert parent.status == 'C'
    assert Task.objects.filter(type='downstream_task').count() == 1

    # Replaying the completion from the stale copy must be a no-op
    stale_b.complete(next_type='downstream_task', next_subject_id=subject_id)
    assert Task.objects.filter(type='downstream_task').count() == 1


def test_processor_worker_survives_bad_task(monkeypatch):
    # A task that raises during processing must not kill the worker thread and
    # must still call q.task_done() so the dispatch loop's q.join() can return
    from photonix.photos.management.commands import raw_processor, thumbnail_processor

    class StubTask:
        subject_id = 'poisoned'
        id = 'stub-task-id'

        def __init__(self):
            self.marked_failed = False

        def failed(self):
            self.marked_failed = True

    def raise_error(subject_id, task):
        raise ValueError('simulated corrupt file')

    for module, processing_func in [
        (thumbnail_processor, 'generate_thumbnails_for_photo'),
        (raw_processor, 'process_raw_task'),
    ]:
        monkeypatch.setattr(module, processing_func, raise_error)
        task = StubTask()
        thread = threading.Thread(target=module.worker, daemon=True)
        thread.start()
        module.q.put(task)

        # Equivalent to q.join() but fails rather than deadlocks on regression
        deadline = time.time() + 10
        while module.q.unfinished_tasks and time.time() < deadline:
            time.sleep(0.05)
        assert module.q.unfinished_tasks == 0

        assert task.marked_failed
        module.q.put(None)  # Shut worker down cleanly
        thread.join(timeout=5)
        assert not thread.is_alive()


def _backdate_task(task, **fields):
    # Task.save() always refreshes updated_at, so backdating has to go
    # through a queryset update
    Task.objects.filter(pk=task.pk).update(**fields)
    task.refresh_from_db()


def test_requeue_stuck_tasks_respects_age_and_type(db):
    from datetime import timedelta

    from photonix.photos.utils.tasks import requeue_stuck_tasks

    library = LibraryFactory()
    stuck = _make_task(type='classify.color', status='S', library=library)
    failed = _make_task(type='classify.color', status='F', library=library)
    recent = _make_task(type='classify.color', status='S', library=library)
    other_type = _make_task(type='classify.object', status='S', library=library)

    two_hours_ago = timezone.now() - timedelta(hours=2)
    for task in (stuck, failed, other_type):
        _backdate_task(task, updated_at=two_hours_ago)

    requeue_stuck_tasks('classify.color', age_hours=1)

    for task in (stuck, failed, recent, other_type):
        task.refresh_from_db()
    assert stuck.status == 'P'
    assert failed.status == 'P'
    assert recent.status == 'S'  # Not old enough to be considered stuck
    assert other_type.status == 'S'  # Different task type must be untouched


def test_requeue_memory_wait_tasks(db):
    from datetime import timedelta

    from photonix.photos.utils.tasks import requeue_memory_wait_tasks

    library = LibraryFactory()
    past = timezone.now() - timedelta(seconds=1)
    future = timezone.now() + timedelta(hours=1)
    ready = _make_task(type='classify.color', status='M', memory_retry_at=past, library=library)
    not_ready = _make_task(type='classify.color', status='M', memory_retry_at=future, library=library)
    other_type = _make_task(type='classify.object', status='M', memory_retry_at=past, library=library)

    assert requeue_memory_wait_tasks('classify.color') == 1

    for task in (ready, not_ready, other_type):
        task.refresh_from_db()
    assert ready.status == 'P'
    assert ready.memory_retry_at is None
    assert not_ready.status == 'M'
    assert other_type.status == 'M'

    # Without a type filter all ready memory-wait tasks are requeued
    assert requeue_memory_wait_tasks() == 1
    other_type.refresh_from_db()
    assert other_type.status == 'P'


def test_requeue_delayed_tasks(db):
    from datetime import timedelta

    from photonix.photos.utils.tasks import requeue_delayed_tasks

    library = LibraryFactory()
    past = timezone.now() - timedelta(seconds=1)
    future = timezone.now() + timedelta(hours=1)
    ready = _make_task(type='classify.face', status='D', delayed_until=past, library=library)
    not_ready = _make_task(type='classify.face', status='D', delayed_until=future, library=library)

    assert requeue_delayed_tasks() == 1

    for task in (ready, not_ready):
        task.refresh_from_db()
    assert ready.status == 'P'
    assert ready.delayed_until is None
    assert not_ready.status == 'D'


def test_queue_reclassification_debounces_and_requeues(db):
    from datetime import timedelta

    from photonix.photos.utils.tasks import (
        ROTATION_SENSITIVE_CLASSIFIERS, queue_reclassification_for_photo,
        requeue_delayed_tasks)
    from .factories import PhotoFactory

    photo = PhotoFactory()

    queued = queue_reclassification_for_photo(photo)
    assert sorted(queued) == sorted(ROTATION_SENSITIVE_CLASSIFIERS)
    tasks = Task.objects.filter(subject_id=photo.id)
    assert tasks.count() == len(ROTATION_SENSITIVE_CLASSIFIERS)
    assert all(t.status == 'D' and t.delayed_until for t in tasks)

    # Re-queueing must debounce onto the same tasks, not create duplicates
    queue_reclassification_for_photo(photo)
    assert Task.objects.filter(subject_id=photo.id).count() == len(ROTATION_SENSITIVE_CLASSIFIERS)

    # Once the delay passes the tasks become processable again
    Task.objects.filter(subject_id=photo.id).update(delayed_until=timezone.now() - timedelta(seconds=1))
    assert requeue_delayed_tasks() == len(ROTATION_SENSITIVE_CLASSIFIERS)
    assert Task.objects.filter(subject_id=photo.id, status='P').count() == len(ROTATION_SENSITIVE_CLASSIFIERS)
