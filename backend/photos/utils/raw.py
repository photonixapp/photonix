import json

from photos.models import Task, Photo


NON_RAW_MIMETYPES = [
    'image/jpeg',
]

def process_ensure_jpeg_exists_tasks():
    for task in Task.objects.filter(type='ensure_jpeg_exists', status='P'):
        photo_id = task.subject_id
        ensure_jpeg_exists(photo_id, task)


def ensure_jpeg_exists(photo_id, task):
    task.start()
    photo = Photo.objects.get(id=photo_id)
    has_raw_photos = False
    for photo_file in photo.files.all():
        if photo_file.mimetype not in NON_RAW_MIMETYPES:
            has_raw_photos = True
            break
    if has_raw_photos:
        # TODO: make task for parallel raw processing
        pass
    task.complete(next_type='generate_thumbnails', next_subject_id=photo_id)
