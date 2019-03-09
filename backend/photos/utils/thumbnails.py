
import io
import os

from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageOps

from photos.models import Photo, Task
from photos.utils.metadata import PhotoMetadata


def process_generate_thumbnails_tasks():
    for task in Task.objects.filter(type='generate_thumbnails', status='P').order_by('created_at'):
        photo_id = task.subject_id
        generate_thumbnails_for_photo(photo_id, task)


def generate_thumbnails_for_photo(photo, task):
    task.start()

    if not isinstance(photo, Photo):
        photo = Photo.objects.get(id=photo)

    # TODO: Put these tasks on a thumbnailing queue like the classification_scheduler so it can be done in parallel
    for thumbnail in settings.THUMBNAIL_SIZES:
        if thumbnail[4]:  # Required from the start
            try:
                get_thumbnail(photo, thumbnail[0], thumbnail[1], thumbnail[2], thumbnail[3], force_regenerate=True)
            except (FileNotFoundError, IndexError):
                task.failed()
                return

    # Complete task for photo and add next task for classifying images
    task.complete(next_type='classify_images', next_subject_id=photo.id)


def get_thumbnail_path(photo, width=256, height=256, crop='cover', quality=75):
    if not isinstance(photo, Photo):
        photo = Photo.objects.get(id=photo)

    directory = os.path.join(settings.THUMBNAIL_ROOT, '{}x{}_{}_q{}'.format(width, height, crop, quality))
    if not os.path.exists(directory):
        os.makedirs(directory)

    return os.path.join(directory, '{}.jpg'.format(photo.id))


def get_thumbnail(photo, width=256, height=256, crop='cover', quality=75, return_type='path', force_regenerate=False):
    if not isinstance(photo, Photo):
        photo = Photo.objects.get(id=photo)

    # If thumbnail image was previously generated and we weren't told to re-generate, return that one
    output_path = get_thumbnail_path(photo, width, height, crop, quality)
    if os.path.exists(output_path):
        if return_type == 'bytes':
            return open(output_path, 'rb').read()
        else:
            return output_path

    # Read base image and metadata
    input_path = photo.base_image_path
    im = Image.open(input_path)

    if im.mode != 'RGB':
        im = im.convert('RGB')

    metadata = PhotoMetadata(input_path)

    # Perform rotations if decalared in metadata
    if metadata.get('Orientation') in ['Rotate 90 CW', 'Rotate 270 CCW']:
        im = im.rotate(-90, expand=True)
    elif metadata.get('Orientation') in ['Rotate 90 CCW', 'Rotate 270 CW']:
        im = im.rotate(90, expand=True)

    # Crop / resize
    if crop == 'cover':
        im = ImageOps.fit(im, (width, height), Image.ANTIALIAS)
    else:
        im.thumbnail((width, height), Image.ANTIALIAS)

    # Save to disk (keeping the bytes in memory if we need to return them)
    if return_type == 'bytes':
        img_byte_array = io.BytesIO()
        im.save(img_byte_array, format='JPEG', quality=quality)
        with open(output_path, 'wb') as f:
            f.write(img_byte_array.getvalue())
    else:
        im.save(output_path, format='JPEG', quality=quality)

    # Update Photo DB model
    photo.last_thumbnailed_version = 0
    photo.last_thumbnailed_at = timezone.now()
    photo.save()

    # Return accordingly
    if return_type == 'bytes':
        return img_byte_array.getvalue()
    return output_path
