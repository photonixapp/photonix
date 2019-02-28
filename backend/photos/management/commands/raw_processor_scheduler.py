from time import sleep

from django.core.management.base import BaseCommand

from photos.models import Photo, Task
from photos.utils.raw import process_ensure_raw_processed_tasks


class Command(BaseCommand):
    help = 'Loads unthumbnailed photos onto the thumbnailing queues for processing.'

    def run_scheduler(self):
        while True:
            num_remaining = Task.objects.filter(type='ensure_raw_processed', status='P').count()
            if num_remaining:
                print('{} photos remaining for raw processing'.format(num_remaining))
                process_ensure_raw_processed_tasks()
                print('Finished scheduling raw processing')
            sleep(1)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)
