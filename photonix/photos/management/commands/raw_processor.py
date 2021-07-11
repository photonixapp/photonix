import queue
import threading
from multiprocessing import cpu_count
from time import sleep

from django.core.management.base import BaseCommand

from photonix.photos.models import Task
from photonix.photos.utils.raw import process_raw_task
from photonix.photos.utils.tasks import requeue_stuck_tasks
from photonix.web.utils import logger


q = queue.Queue()


def worker():
    while True:
        task = q.get()

        if task is None:
            break

        process_raw_task(task.subject_id, task)

        q.task_done()


class Command(BaseCommand):
    help = 'Processes raw photos into a JPEG we can use elsewhere.'

    def run_processors(self):
        num_workers = max(int(cpu_count() / 4), 1)
        threads = []

        logger.info(f'Starting {num_workers} raw processor workers')

        for i in range(num_workers):
            t = threading.Thread(target=worker)
            t.start()
            threads.append(t)

        try:
            while True:
                requeue_stuck_tasks('process_raw')

                num_remaining = Task.objects.filter(type='process_raw', status='P').count()
                if num_remaining:
                    logger.info(f'{num_remaining} tasks remaining for raw processing')

                # Load 'Pending' tasks onto worker threads
                for task in Task.objects.filter(type='process_raw', status='P')[:64]:
                    q.put(task)
                    logger.info('Finished raw processing batch')

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
