from time import sleep

from django.core.management.base import BaseCommand

from photonix.photos.models import Task
from photonix.photos.utils.classification import process_classify_images_tasks
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Loads unclassified photos onto the classification queues for processing.'

    def run_scheduler(self):
        while True:
            num_remaining = Task.objects.filter(type='classify_images', status='P').count()
            if num_remaining:
                logger.info('{} photos remaining for classification'.format(num_remaining))
                process_classify_images_tasks()
            sleep(1)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)
