from time import sleep

from django.core.management.base import BaseCommand

from photos.models import Photo, Task
from photos.utils.raw import process_raw_tasks


class Command(BaseCommand):
    help = 'Processes raw photos in a JPEG we can use elsewhere.'

    def run_processors(self):
        while True:
            num_remaining = Task.objects.filter(type='process_raw', status='P').count()
            if num_remaining:
                print('{} tasks remaining for raw processing'.format(num_remaining))
                process_raw_tasks()
                print('Finished raw processing')
            sleep(1)

    def handle(self, *args, **options):
        try:
            self.run_processors()
        except KeyboardInterrupt:
            exit(0)
