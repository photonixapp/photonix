from django.core.management.base import BaseCommand

from photonix.photos.utils.organise import import_photos_from_dir
from photonix.photos.utils.system import missing_system_dependencies
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Copies all photos from one directory into structured data folder hierchy and creates relevant database records'

    def add_arguments(self, parser):
        parser.add_argument('paths', nargs='+')

    def import_photos(self, paths):
        missing = missing_system_dependencies(['exiftool', ])
        if missing:
            logger.critical('Missing dependencies: {}'.format(missing))
            exit(1)

        for path in paths:
            import_photos_from_dir(path)

    def handle(self, *args, **options):
        self.import_photos(options['paths'])
