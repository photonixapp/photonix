import inotify.adapters
from pathlib import Path
from time import sleep

from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.utils.db import record_photo
from photonix.photos.models import LibraryPath


class Command(BaseCommand):
    help = 'Watches photo directories and creates relevant database records for all photos that are added or modified.'

    def watch_photos(self):
        while True:
            library_paths = LibraryPath.objects.filter(type='St', backend_type='Lo')

            for library_path in library_paths:
                print(f'Watching path for changes {library_path.path}')

                # TODO: Work out how to watch multiple paths at once
                i = inotify.adapters.InotifyTree(library_path.path)

                for event in i.event_gen():
                    if event is not None:
                        (header, type_names, watch_path, filename) = event
                        # if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_FROM', 'IN_MOVED_TO']):  # TODO: Make moving photos really efficient by using the 'from' path
                        if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_TO']):
                            photo_path = Path(watch_path, filename)
                            print(f'Recording photo "{photo_path}" to library "{library_path.library}"')
                            record_photo(photo_path, library_path.library)

            sleep(5)

    def handle(self, *args, **options):
        try:
            self.watch_photos()
        except KeyboardInterrupt:
            exit(0)
