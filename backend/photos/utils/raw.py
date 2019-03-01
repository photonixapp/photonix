import json
import os
from pathlib import Path
from shutil import copyfile, rmtree
import subprocess
import tempfile

from PIL import Image

from .metadata import get_dimensions
from photos.models import Task, Photo


NON_RAW_MIMETYPES = [
    'image/jpeg',
]


def process_ensure_raw_processed_tasks():
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
            break

    next_task_type = 'generate_thumbnails'
    if has_raw_photos:
        # TODO: Make task for parallel raw processing
        pass

    # Complete and add next task to generate thumbnails
    task.complete(next_type='generate_thumbnails', next_subject_id=photo_id)


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


def generate_jpeg(path):
    basename = os.path.basename(path)
    temp_dir = tempfile.mkdtemp()
    temp_input_path = Path(temp_dir) / basename
    copyfile(path, temp_input_path)

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
    rmtree(temp_dir)

    if valid_image:
        return (final_path, process_params)
    return (None, None)
