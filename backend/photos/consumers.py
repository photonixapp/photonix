import json

from django.conf import settings

from photos.models import Photo
from photos.utils.organise import import_photos_in_place
from photos.utils.thumbnails import generate_thumbnail


def rescan_photos(message):
    paths = [item['PATH'] for item in settings.PHOTO_OUTPUT_DIRS]
    for path in paths:
        import_photos_in_place(path)


def generate_thumbnails_for_photo(message):
    if message:
        data = json.loads(message['text'])
        if data['id']:
            photo = Photo.objects.get(id=data['id'])
            for thumbnail in settings.THUMBNAIL_SIZES:
                generate_thumbnail(photo, thumbnail[0], thumbnail[1], thumbnail[2], thumbnail[3])
