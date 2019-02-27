import os
import queue
import threading
from multiprocessing import cpu_count
from time import sleep

from django.core.management.base import BaseCommand

# Pre-load the model graphs so it doesn't have to be done for each job
from classifiers.object import ObjectModel, run_on_photo
from photos.models import Task


print('Loading object classification model')
model = ObjectModel()
q = queue.Queue()


def worker():
    while True:
        task = q.get()

        if task is None:
            break

        task.start()
        run_on_photo(task.subject_id)
        task.complete()

        q.task_done()


class Command(BaseCommand):
    help = 'Runs the workers with the object classification model.'

    def handle(self, *args, **options):
        num_workers = 4
        threads = []

        print('Starting {} object classification workers\n'.format(num_workers))

        for i in range(num_workers):
            t = threading.Thread(target=worker)
            t.start()
            threads.append(t)

        try:
            while True:
                for task in Task.objects.filter(type='classify.object', status='P')[:64]:
                    q.put(task)
                q.join()  # Blocks until all threads have finished and queue is empty
                sleep(1)

        except KeyboardInterrupt:
            # Shut down threads cleanly
            for i in range(num_workers):
                q.put(None)
            for t in threads:
                t.join()
