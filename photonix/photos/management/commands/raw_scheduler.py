from time import sleep

from django.core.management.base import BaseCommand

from photonix.photos.models import Task
from photonix.photos.utils.raw import ensure_raw_processing_tasks
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Loads raw photos onto the raw file processing queues.'

    def run_scheduler(self):
        while True:
            num_remaining = Task.objects.filter(type='ensure_raw_processed', status='P').count()
            if num_remaining:
                logger.info(f'{num_remaining} tasks remaining for raw process scheduling')
                ensure_raw_processing_tasks()
                logger.info('Finished raw process scheduling')
            sleep(1)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)
