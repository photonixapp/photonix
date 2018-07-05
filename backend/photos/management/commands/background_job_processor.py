import os
from multiprocessing import Process, cpu_count

from django.core.management.base import BaseCommand
import redis
from rq import Connection, Worker

from classifiers import STYLE_MODEL  # Pre-load the classification model graphs so it doesn't have to be done for each job


r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))


def worker(queues):
    w = Worker(queues, connection=r)
    w.work()


class Command(BaseCommand):
    help = 'Runs the RQ workers.'

    def handle(self, *args, **options):
        with Connection():
            queues = ['default', 'low', 'normal', 'high']
            num_workers = cpu_count()
            print('Starting {} workers\n'.format(num_workers))

            for i in range(num_workers):
                p = Process(target=worker, args=(queues,))
                p.start()
