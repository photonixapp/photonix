from datetime import datetime, timedelta
import os
import queue
import threading
from multiprocessing import cpu_count
from time import sleep

from django.core.management.base import BaseCommand

# Pre-load the model graphs so it doesn't have to be done for each job
from classifiers.location import LocationModel, run_on_photo
from photos.models import Task


print('Loading object location model')
model = LocationModel()
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
    help = 'Runs the RQ workers with the location classification model.'

    def handle(self, *args, **options):
        num_workers = 4
        threads = []

        print('Starting {} location classification workers\n'.format(num_workers))

        for i in range(num_workers):
            t = threading.Thread(target=worker)
            t.start()
            threads.append(t)

        try:
            while True:
                # Set old, failed jobs to 'Pending'
                for task in Task.objects.filter(type='classify.location', status='S', updated_at__lt=datetime.now() - timedelta(hours=24))[:8]:
                    task.status = 'P'
                    task.save()
                for task in Task.objects.filter(type='classify.location', status='F', updated_at__lt=datetime.now() - timedelta(hours=24))[:8]:
                    task.status = 'P'
                    task.save()

                # Load 'Pending' tasks onto worker threads
                for task in Task.objects.filter(type='classify.location', status='P')[:64]:
                    q.put(task)

                # Wait until all threads have finished
                q.join()
                sleep(1)

        except KeyboardInterrupt:
            # Shut down threads cleanly
            for i in range(num_workers):
                q.put(None)
            for t in threads:
                t.join()
