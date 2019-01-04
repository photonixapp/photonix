import os
from multiprocessing import Process, cpu_count

from django.core.management.base import BaseCommand
import redis
from rq import Connection, Worker
import psutil

# Pre-load the model graphs so it doesn't have to be done for each job
from classifiers.color import ColorModel


model = ColorModel()


def worker(queues):
    r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))
    w = Worker(queues, connection=r)
    w.work()


class Command(BaseCommand):
    help = 'Runs the RQ workers with the classification models.'

    def handle(self, *args, **options):
        with Connection():
            queues = ['classification_color']
            num_cpus = cpu_count()
            ram_mb_available = int(psutil.virtual_memory().available / 1024 / 1024)
            num_fit_in_ram = max(1, int((ram_mb_available / model.approx_ram_mb) - 1))
            num_workers = min(num_cpus, num_fit_in_ram)
            if hasattr(model, 'max_num_workers'):
                num_workers = min(num_workers, model.max_num_workers)

            print('Starting {} color classification workers\n'.format(num_workers))

            for i in range(num_workers):
                p = Process(target=worker, args=(queues,))
                p.start()
