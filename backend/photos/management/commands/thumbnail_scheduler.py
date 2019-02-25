from time import sleep

from django.core.management.base import BaseCommand

from photos.models import Photo
from photos.utils.thumbnails import process_generate_thumbnails_tasks, generate_thumbnails_for_photo


class Command(BaseCommand):
    help = 'Loads unthumbnailed photos onto the thumbnailing queues for processing.'

    def run_scheduler(self):
        while True:
            total = Task.objects.filter(type='ensure_thumbnails_exists', status='P').count()
            if total:
                print('{} photos remaining for thumbnailing'.format(total))
                process_generate_thumbnails_tasks()
            sleep(5)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)
