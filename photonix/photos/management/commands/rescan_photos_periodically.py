from time import sleep

from django.conf import settings
from django.core.management.base import BaseCommand
from redis_lock import Lock

from photonix.photos.utils.organise import rescan_photo_libraries
from photonix.photos.utils.system import missing_system_dependencies
from photonix.photos.utils.redis import redis_connection
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Creates relevant database records for all photos that are in a folder.'

    def add_arguments(self, parser):
        parser.add_argument('--paths', nargs='+', default=[])

    def rescan_photos(self, paths):
        missing = missing_system_dependencies(['exiftool', ])
        if missing:
            logger.critical(f'Missing dependencies: {missing}')
            exit(1)

        rescan_photo_libraries(paths)
        logger.info('Rescan complete')

    def handle(self, *args, **options):
        try:
            while True:
                with Lock(redis_connection, 'rescan_photos'):
                    self.rescan_photos(options['paths'])
                sleep(60 * 60)  # Sleep for an hour
        except KeyboardInterrupt:
            pass