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
