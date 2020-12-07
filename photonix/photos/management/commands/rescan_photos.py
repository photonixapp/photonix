from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.utils.organise import rescan_photo_libraries
from photonix.photos.utils.system import missing_system_dependencies
# from web.utils import notify_ui


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
        print('Completed')

    def handle(self, *args, **options):
        # notify_ui('photo_dirs_scanning', True)
        self.rescan_photos(options['paths'])
        # notify_ui('photo_dirs_scanning', False)
