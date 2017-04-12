import inotify.adapters
import json

from channels import Channel
from django.conf import settings
from django.core.management.base import BaseCommand

from photos.utils.db import record_photo
from web.utils import notify


class Command(BaseCommand):
    help = 'Watches photo directories and creates relevant database records for all photos that are added or modified.'

    def add_arguments(self, parser):
        parser.add_argument('--paths', nargs='+', default=[item['PATH'] for item in settings.PHOTO_OUTPUT_DIRS])

    def watch_photos(self, paths):
        for path in paths:
            print(path)
            # TODO: Work out how to watch multiple paths at once
            i = inotify.adapters.InotifyTree(path.encode('utf-8'))

            for event in i.event_gen():
                if event is not None:
                    (header, type_names, watch_path, filename) = event
                    # if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_FROM', 'IN_MOVED_TO']):  # TODO: Make moving photos really efficient by using the 'from' path
                    if set(type_names).intersection(['IN_CLOSE_WRITE', 'IN_DELETE', 'IN_MOVED_TO']):
                        notify('photo_dirs_scanning', True)
                        photo_path = '{}/{}'.format(watch_path.decode('utf-8'), filename.decode('utf-8'))
                        photo = record_photo(photo_path)
                        notify('photo_dirs_scanning', False)
                        if photo:
                            Channel('generate-thumbnails-for-photo').send({'text': json.dumps({'id': str(photo.id)})})

    def handle(self, *args, **options):
        self.watch_photos(options['paths'])
