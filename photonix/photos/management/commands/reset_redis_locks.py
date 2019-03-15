import os

import redis_lock

from django.core.management.base import BaseCommand
import redis


r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))


class Command(BaseCommand):
    help = 'Removes all Redis locks - intended to be run on server start.'

    def handle(self, *args, **options):
        redis_lock.reset_all(r)
