import json
from time import sleep

from channels import Group
from django.conf import settings

from photos.models import Photo
from photos.utils.organise import import_photos_in_place
from photos.utils.thumbnails import generate_thumbnail
from web.utils import notify


def rescan_photos(message):
    notify('photo_dirs_scanning', True)

    paths = [item['PATH'] for item in settings.PHOTO_OUTPUT_DIRS]
    for path in paths:
        import_photos_in_place(path)

    notify('photo_dirs_scanning', False)


def generate_thumbnails_for_photo(message):
    if message:
        data = json.loads(message['text'])
        print(data)
        if data['id']:
            photo = Photo.objects.get(id=data['id'])
            generate_thumbnail(photo)
