import json

from django.conf import settings

from config.managers import global_state
from photos.models import Photo
from photos.utils.organise import import_photos_in_place
from photos.utils.thumbnails import generate_thumbnail


def rescan_photos(message):
    global_state.increment('photo_import_tasks_running')

    paths = [item['PATH'] for item in settings.PHOTO_OUTPUT_DIRS]
    for path in paths:
        import_photos_in_place(path)

    global_state.decrement('photo_import_tasks_running')


def generate_thumbnails_for_photo(message):
    if message:
        data = json.loads(message['text'])
        print(data)
        if data['id']:
            photo = Photo.objects.get(id=data['id'])
            generate_thumbnail(photo)
