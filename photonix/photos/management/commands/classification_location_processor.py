import queue
import threading
from time import sleep

from django.core.management.base import BaseCommand
# Pre-load the model graphs so it doesn't have to be done for each job
from photonix.classifiers.location import LocationModel, run_on_photo
from photonix.photos.models import Task
from photonix.photos.utils.tasks import requeue_stuck_tasks

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
    help = 'Runs the workers with the location classification model.'

    def run_processors(self):
        num_workers = 4
        threads = []

        print('Starting {} location classification workers\n'.format(num_workers))

        for i in range(num_workers):
            t = threading.Thread(target=worker)
            t.start()
            threads.append(t)

        try:
            while True:
                requeue_stuck_tasks('classify.location')

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

    def handle(self, *args, **options):
        self.run_processors()
