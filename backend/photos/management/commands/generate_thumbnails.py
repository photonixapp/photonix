from django.core.management.base import BaseCommand

from photos.models import Photo
from photos.utils.thumbnails import generate_thumbnails_for_photo


class Command(BaseCommand):
    help = 'Generates thumbnails for all the Photos that have tasks'

    def generate_thumbnails(self):
        num_remaining = Task.objects.filter(type='ensure_thumbnails_exists', status='P').count()
        if num_remaining:
            print('Thumbnailing {} photos'.format(num_remaining))
            process_generate_thumbnails_tasks()

    def handle(self, *args, **options):
        self.generate_thumbnails()
