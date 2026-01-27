from datetime import timedelta

from django.utils import timezone
from django.db.models import Q
from photonix.photos.models import Task


def requeue_stuck_tasks(task_type, age_hours=24, max_num=8):
    # Set old, failed jobs to Pending
    for task in Task.objects.filter(type=task_type, status='S', updated_at__lt=timezone.now() - timedelta(hours=24))[:max_num]:
        task.status = 'P'
        task.save()
    for task in Task.objects.filter(type=task_type, status='F', updated_at__lt=timezone.now() - timedelta(hours=24))[:max_num]:
        task.status = 'P'
        task.save()


def count_remaining_task(task_type):
    """Returned count of remaining task."""
    return {
        'remaining': Task.objects.filter(Q(type=task_type), Q(status='P') | Q(status='S')).count()}


def requeue_memory_wait_tasks(task_type=None):
    """Requeue tasks that were waiting for memory and are ready to retry.

    Args:
        task_type: Optional task type to filter by. If None, requeues all memory-wait tasks.

    Returns:
        Number of tasks requeued.
    """
    queryset = Task.objects.filter(
        status='M',
        memory_retry_at__lte=timezone.now()
    )
    if task_type:
        queryset = queryset.filter(type=task_type)

    count = queryset.update(status='P', memory_retry_at=None)
    return count


def requeue_delayed_tasks(task_type=None):
    """Requeue tasks that were delayed and are now ready to start.

    Args:
        task_type: Optional task type to filter by. If None, requeues all delayed tasks.

    Returns:
        Number of tasks requeued.
    """
    queryset = Task.objects.filter(
        status='D',
        delayed_until__lte=timezone.now()
    )
    if task_type:
        queryset = queryset.filter(type=task_type)

    count = queryset.update(status='P', delayed_until=None)
    return count


# Classifiers that need to be re-run when image orientation changes
ROTATION_SENSITIVE_CLASSIFIERS = ['classify.face', 'classify.object', 'classify.style']

# Default delay before starting reclassification (allows debouncing rapid rotations)
DEFAULT_RECLASSIFICATION_DELAY_SECONDS = 10


def queue_reclassification_for_photo(photo, delay_seconds=None):
    """Queue rotation-sensitive classifiers for re-processing.

    Used when user rotates an image or changes preferred photo file.
    Uses delayed status to debounce rapid actions - if user clicks rotate
    multiple times, we only run classification once after they stop.

    Args:
        photo: Photo instance to reclassify
        delay_seconds: Seconds to delay before processing (default 10)

    Returns:
        List of task types that were queued/updated
    """
    from django.conf import settings
    from photonix.photos.utils.classification import CLASSIFIER_PRIORITIES

    if delay_seconds is None:
        delay_seconds = getattr(
            settings, 'RECLASSIFICATION_DELAY_SECONDS',
            DEFAULT_RECLASSIFICATION_DELAY_SECONDS
        )

    delayed_until = timezone.now() + timedelta(seconds=delay_seconds)
    queued_types = []

    for task_type in ROTATION_SENSITIVE_CLASSIFIERS:
        # Check for existing Pending or Delayed task for this photo/classifier
        existing_task = Task.objects.filter(
            type=task_type,
            subject_id=photo.id,
            status__in=['P', 'D']
        ).first()

        if existing_task:
            # Debounce: reset delay timer on existing task
            existing_task.status = 'D'
            existing_task.delayed_until = delayed_until
            existing_task.save()
        else:
            # Create new delayed task
            classifier_name = task_type.replace('classify.', '')
            priority = CLASSIFIER_PRIORITIES.get(classifier_name, 50)
            Task.objects.create(
                type=task_type,
                subject_id=photo.id,
                status='D',
                delayed_until=delayed_until,
                library=photo.library,
                priority=priority,
            )

        queued_types.append(task_type)

    return queued_types
