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
