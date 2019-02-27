from time import sleep

from django.core.management.base import BaseCommand

from photos.models import Photo, Task
from photos.utils.thumbnails import process_generate_thumbnails_tasks, generate_thumbnails_for_photo


class Command(BaseCommand):
    help = 'Loads unthumbnailed photos onto the thumbnailing queues for processing.'

    def run_scheduler(self):
        while True:
            num_remaining = Task.objects.filter(type='generate_thumbnails', status='P').count()
            if num_remaining:
                print('{} photos remaining for thumbnailing'.format(num_remaining))
                process_generate_thumbnails_tasks()
                print('Finished scheduling thumbnailing')
            sleep(5)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)
