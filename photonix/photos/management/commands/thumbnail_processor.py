import queue
import threading
from multiprocessing import cpu_count
from time import sleep

from django.core.management.base import BaseCommand

from photonix.photos.models import Task
from photonix.photos.utils.tasks import requeue_stuck_tasks
from photonix.photos.utils.thumbnails import generate_thumbnails_for_photo
from photonix.web.utils import logger


q = queue.Queue()


def worker():
    while True:
        task = q.get()

        if task is None:
            break

        generate_thumbnails_for_photo(task.subject_id, task)

        q.task_done()


class Command(BaseCommand):
    help = 'Processes full-sized photos into thumbnails of various sizes.'

    def run_processors(self):
        num_workers = max(int(cpu_count() / 4), 1)
        threads = []

        logger.info('Starting {} thumbnail processor workers'.format(num_workers))

        for i in range(num_workers):
            t = threading.Thread(target=worker)
            t.start()
            threads.append(t)

        try:
            while True:
                requeue_stuck_tasks('generate_thumbnails')

                num_remaining = Task.objects.filter(type='generate_thumbnails', status='P').count()
                if num_remaining:
                    logger.info('{} tasks remaining for thumbnail processing'.format(num_remaining))

                # Load 'Pending' tasks onto worker threads
                for task in Task.objects.filter(type='generate_thumbnails', status='P')[:64]:
                    q.put(task)
                    logger.info('Finished thumbnail processing batch')

                # Wait until all threads have finished
                q.join()
                sleep(1)

        except KeyboardInterrupt:
            # Shut down threads cleanly
            for i in range(num_workers):
                q.put(None)
            for t in threads:
                t.join()


    def handle(self, *args, **options):
        self.run_processors()
