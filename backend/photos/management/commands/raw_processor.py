import queue
import threading
from multiprocessing import cpu_count
from time import sleep

from django.core.management.base import BaseCommand

from photos.models import Task
from photos.utils.raw import process_raw_task
from photos.utils.tasks import requeue_stuck_tasks


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
        num_workers = cpu_count()
        threads = []

        print('Starting {} raw processor workers\n'.format(num_workers))

        for i in range(num_workers):
            t = threading.Thread(target=worker)
            t.start()
            threads.append(t)

        try:
            while True:
                requeue_stuck_tasks('process_raw')

                num_remaining = Task.objects.filter(type='process_raw', status='P').count()
                if num_remaining:
                    print('{} tasks remaining for raw processing'.format(num_remaining))

                # Load 'Pending' tasks onto worker threads
                for task in Task.objects.filter(type='process_raw', status='P')[:64]:
                    q.put(task)
                    print('Finished raw processing batch')

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
