from django.core.management.base import BaseCommand

from config.managers import global_state
from photos.utils.organise import import_photos_from_dir
from photos.utils.system import missing_system_dependencies


class Command(BaseCommand):
    help = 'Copies all photos from one directory into structured data folder hierchy and creates relevant database records'

    def add_arguments(self, parser):
        parser.add_argument('paths', nargs='+')

    def import_photos(self, paths):
        missing = missing_system_dependencies(['exiftool', ])
        if missing:
            print('Missing dependencies: {}'.format(missing))
            exit(1)

        for path in paths:
            import_photos_from_dir(path)

    def handle(self, *args, **options):
        global_state.increment('photo_import_tasks_running')
        self.import_photos(options['paths'])
        global_state.decrement('photo_import_tasks_running')
