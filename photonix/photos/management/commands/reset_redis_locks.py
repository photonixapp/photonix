from django.core.management.base import BaseCommand
import redis_lock

from photonix.photos.utils.redis import redis_connection


class Command(BaseCommand):
    help = 'Removes all Redis locks - intended to be run on server start.'

    def handle(self, *args, **options):
        redis_lock.reset_all(redis_connection)
