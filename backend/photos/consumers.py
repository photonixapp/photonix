import json

from django.conf import settings

from photos.utils.organise import import_photos_in_place
from photos.utils.thumbnails import generate_thumbnails_for_photo


def rescan_photos(message):
    paths = [item['PATH'] for item in settings.PHOTO_OUTPUT_DIRS]
    for path in paths:
        import_photos_in_place(path)


def photo_added(message):
    if message:
        data = json.loads(message['text'])
        if data['id']:
            generate_thumbnails_for_photo(data['id'])
