import os

from django.conf import settings
from django.core.management.base import BaseCommand
import redis
from redis_lock import Lock

from photonix.photos.utils.organise import rescan_photo_libraries
from photonix.photos.utils.system import missing_system_dependencies


class Command(BaseCommand):
    help = 'Creates relevant database records for all photos that are in a folder.'

    def add_arguments(self, parser):
        parser.add_argument('--paths', nargs='+', default=[])

    def rescan_photos(self, paths):
        missing = missing_system_dependencies(['exiftool', ])
        if missing:
            print('Missing dependencies: {}'.format(missing))
            exit(1)

        rescan_photo_libraries(paths)
        print('Rescan complete')

    def handle(self, *args, **options):
        r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))
        with Lock(r, 'rescan_photos'):
            self.rescan_photos(options['paths'])
