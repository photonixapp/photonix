import inotify.adapters

from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.utils.db import record_photo


class Command(BaseCommand):
    help = 'Watches photo directories and creates relevant database records for all photos that are added or modified.'

    def add_arguments(self, parser):
        parser.add_argument('--paths', nargs='+', default=[item['PATH'] for item in settings.PHOTO_OUTPUT_DIRS])

    def watch_photos(self, paths):
        for path in paths:
            print(path)
            # TODO: Work out how to watch multiple paths at once
            i = inotify.adapters.InotifyTree(path)

            for event in i.event_gen():
                if event is not None:
                    (header, type_names, watch_path, filename) = event
                    # if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_FROM', 'IN_MOVED_TO']):  # TODO: Make moving photos really efficient by using the 'from' path
                    if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_TO']):
                        photo_path = '{}/{}'.format(watch_path, filename)
                        record_photo(photo_path)

    def handle(self, *args, **options):
        try:
            self.watch_photos(options['paths'])
        except KeyboardInterrupt:
            exit(0)
