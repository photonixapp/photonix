import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

from django.conf import settings
from PIL import Image

from .metadata import get_dimensions
from photos.models import Task, Photo, PhotoFile


RAW_PROCESS_VERSION = '20190305'
NON_RAW_MIMETYPES = [
    'image/jpeg',
]


def ensure_raw_processing_tasks():
    for task in Task.objects.filter(type='ensure_raw_processed', status='P').order_by('created_at'):
        photo_id = task.subject_id
        ensure_raw_processed(photo_id, task)


def ensure_raw_processed(photo_id, task):
    task.start()
    photo = Photo.objects.get(id=photo_id)
    has_raw_photos = False

    for photo_file in photo.files.all():
        # TODO: Make raw photo detection better
        if photo_file.mimetype not in NON_RAW_MIMETYPES:
            has_raw_photos = True
            Task(type='process_raw', subject_id=photo_file.id, parent=task).save()
            # break

    # next_task_type = 'generate_thumbnails'
    # if has_raw_photos:
    #     # TODO: Make task for parallel raw processing
    #     output_path, process_params = generate_jpeg(photo_file.file)

    # Complete and add next task to generate thumbnails
    if not has_raw_photos:
        task.complete(next_type='generate_thumbnails', next_subject_id=photo_id)


def process_raw_tasks():
    for task in Task.objects.filter(type='process_raw', status='P').order_by('created_at'):
        photo_file_id = task.subject_id
        process_raw_task(photo_file_id, task)


def process_raw_task(photo_file_id, task):
    task.start()
    photo_file = PhotoFile.objects.get(id=photo_file_id)
    output_path, version, process_params, external_version = generate_jpeg(photo_file.path)

    if not os.path.isdir(settings.PHOTO_RAW_PROCESSED_DIR):
        os.mkdir(settings.PHOTO_RAW_PROCESSED_DIR)
    destination_path = Path(settings.PHOTO_RAW_PROCESSED_DIR) / str('{}.jpg'.format(photo_file.id))
    shutil.move(output_path, str(destination_path))

    photo_file.raw_processed = True
    photo_file.raw_version = version
    photo_file.raw_external_params = process_params
    photo_file.raw_external_version = external_version
    photo_file.save()

    task.complete(next_type='generate_thumbnails', next_subject_id=photo_file.photo.id)


def __get_generated_image(temp_dir, basename):
    for fn in os.listdir(temp_dir):
        if fn != basename:
            return Path(temp_dir) / fn


def __has_acceptable_dimensions(original_image_path, new_image_path, accept_empty_original_dimensions=False):
    original_image_dimensions = get_dimensions(original_image_path)
    new_image_dimensions = get_dimensions(new_image_path)

    # We don't know the original dimensions so have nothing to compare to
    if original_image_dimensions == (None, None):
        if accept_empty_original_dimensions:
            return True
        else:
            return False

    # Embedded image can't be the full resolution
    if new_image_dimensions[0] < 512 or new_image_dimensions[1] < 512:
        return False

    # Embedded image is exactly the same dimensions
    if original_image_dimensions == new_image_dimensions:
        return True

    # Embedded image within 95% of the raw width and height
    if original_image_dimensions[0] / new_image_dimensions[0] > 0.95 \
        and original_image_dimensions[1] / new_image_dimensions[1] > 0.95 \
        and new_image_dimensions[0] / original_image_dimensions[0] > 0.95 \
        and new_image_dimensions[1] / original_image_dimensions[1] > 0.95:
        return True

    return False


def identified_as_jpeg(path):
    output = subprocess.Popen(['file', path], stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.PIPE).communicate()[0].decode('utf-8')
    return 'JPEG image data' in output


def bitmap_to_jpeg(input_path, output_path, quality=75):
    im = Image.open(input_path)
    im = im.convert('RGB')
    im.save(output_path, format='JPEG', quality=quality)


def __dcraw_version():
    output = subprocess.Popen(['dcraw'], stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.PIPE).communicate()[0].decode('utf-8')
    for line in output.split('\n'):
        if 'Raw photo decoder "dcraw"' in line:
            try:
                return re.search(r'v([0-9]+.[0-9]+)', line).group(1)
            except AttributeError:
                return


def generate_jpeg(path):
    basename = os.path.basename(path)
    temp_dir = tempfile.mkdtemp()
    temp_input_path = Path(temp_dir) / basename
    shutil.copyfile(path, temp_input_path)

    valid_image = False
    process_params = None

    # First try to extract the JPEG that might be inside the raw file
    subprocess.run(['dcraw', '-e', temp_input_path])
    temp_output_path = __get_generated_image(temp_dir, basename)

    # Check the JPEGs dimensions are close enough to the raw's dimensions
    if temp_output_path:
        if __has_acceptable_dimensions(temp_input_path, temp_output_path):
            valid_image = True
            process_params = 'dcraw -e'
        else:
            os.remove(temp_output_path)

    # Next try to use embedded profile to generate an image
    if not valid_image:
        subprocess.run(['dcraw', '-p embed', temp_input_path])
        temp_output_path = __get_generated_image(temp_dir, basename)

        if temp_output_path:
            if __has_acceptable_dimensions(temp_input_path, temp_output_path):
                valid_image = True
                process_params = 'dcraw -p embed'
            else:
                os.remove(temp_output_path)

    # Finally try to use the embedded whitebalance to generate an image
    if not valid_image:
        subprocess.run(['dcraw', '-w', temp_input_path])
        temp_output_path = __get_generated_image(temp_dir, basename)

        if temp_output_path:
            if __has_acceptable_dimensions(temp_input_path, temp_output_path, True):
                valid_image = True
                process_params = 'dcraw -w'
            else:
                os.remove(temp_output_path)

    # If extracted image isn't a JPEG then we need to convert it
    if valid_image:
        valid_image = identified_as_jpeg(temp_output_path)

        if not valid_image:
            jpeg_path = tempfile.mktemp()
            bitmap_to_jpeg(temp_output_path, jpeg_path)

            if identified_as_jpeg(jpeg_path):
                temp_output_path = jpeg_path
                valid_image = True

    # Move the outputted file to a new temporary location
    if valid_image:
        final_path = tempfile.mktemp()
        os.rename(temp_output_path, final_path)

    # Delete the temporary working directory
    shutil.rmtree(temp_dir)

    if valid_image:
        return (final_path, RAW_PROCESS_VERSION, process_params, __dcraw_version())
    return (None, RAW_PROCESS_VERSION, None, None)
