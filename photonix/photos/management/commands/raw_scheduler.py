from time import sleep

from django.core.management.base import BaseCommand

from photonix.photos.models import Task
from photonix.photos.utils.raw import ensure_raw_processing_tasks


class Command(BaseCommand):
    help = 'Loads raw photos onto the raw file processing queues.'

    def run_scheduler(self):
        while True:
            num_remaining = Task.objects.filter(type='ensure_raw_processed', status='P').count()
            if num_remaining:
                print('{} tasks remaining for raw process scheduling'.format(num_remaining))
                ensure_raw_processing_tasks()
                print('Finished raw process scheduling')
            sleep(1)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)
