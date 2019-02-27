from time import sleep

from django.core.management.base import BaseCommand

from photos.models import Task
from photos.utils.classification import process_classify_images_tasks


class Command(BaseCommand):
    help = 'Loads unclassified photos onto the classification queues for processing.'

    def run_scheduler(self):
        while True:
            num_remaining = Task.objects.filter(type='classify_images', status='P').count()
            if num_remaining:
                print('{} photos remaining for classification'.format(num_remaining))
                process_classify_images_tasks()
            sleep(1)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)