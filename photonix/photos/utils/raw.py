import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from django.conf import settings
from photonix.photos.models import Photo, PhotoFile, Task
from photonix.web.utils import logger

from .metadata import get_dimensions, get_mimetype

RAW_PROCESS_VERSION = '20190305'
NON_RAW_MIMETYPES = [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'image/gif',
    'image/jp2',
    'image/x-portable-pixmap',
    'image/x-xbitmap',
    'image/webp',
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
            Task(type='process_raw', subject_id=photo_file.id, parent=task, library=photo_file.photo.library).save()

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

    if not output_path:
        task.failed('Could not generate JPEG')
        return

    if not os.path.isdir(settings.PHOTO_RAW_PROCESSED_DIR):
        os.mkdir(settings.PHOTO_RAW_PROCESSED_DIR)
    destination_path = Path(settings.PHOTO_RAW_PROCESSED_DIR) / str('{}.jpg'.format(photo_file.id))
    shutil.move(output_path, str(destination_path))

    photo_file.raw_processed = True
    photo_file.raw_version = version
    photo_file.raw_external_params = process_params
    photo_file.raw_external_version = external_version

    if not photo_file.width or not photo_file.height:
        width, height = get_dimensions(photo_file.base_image_path)
        photo_file.width = width
        photo_file.height = height

    photo_file.save()

    task.complete(next_type='generate_thumbnails', next_subject_id=photo_file.photo.id)


def __get_generated_image(temp_dir, basename):
    for fn in os.listdir(temp_dir):
        if fn != basename:
            return Path(temp_dir) / fn

def __get_exiftool_image(temp_dir, basename):
    """
    Exiftool outputs two files when copying the tags over, we
    want the file that ends in .jpg and not .jpg_original, but
    to keep the filesystem tidy we need to get the path.
    """
    exiftool_files = {}
    for fn in os.listdir(temp_dir):
        if fn.endswith('.jpg_original'):
            exiftool_files['original']: Path(temp_dir) / fn
        if fn.endswith('.jpg'):
            exiftool_files['output']: Path(temp_dir) / fn
    return exiftool_files

def __has_acceptable_dimensions(original_image_path, new_image_path, accept_empty_original_dimensions=False):
    logger.debug('Checking image dimensions')
    original_image_dimensions = get_dimensions(original_image_path)
    logger.debug(f'Original image dimensions: {original_image_dimensions}')
    new_image_dimensions = get_dimensions(new_image_path)
    logger.debug(f'New image dimensions: {new_image_dimensions}')

    # We don't know the original dimensions so have nothing to compare to
    if original_image_dimensions == (None, None):
        if accept_empty_original_dimensions:
            logger.debug('No original dimensions, accepting new dimensions')
            return True
        else:
            logger.debug('No original dimensions, rejecting new dimensions')
            return False

    # Embedded image can't be the full resolution
    if not new_image_dimensions[0] or not new_image_dimensions[1] or new_image_dimensions[0] < 512 or new_image_dimensions[1] < 512:
        logger.debug('Dimensions are too small')
        return False

    # Embedded image is exactly the same dimensions
    if original_image_dimensions == new_image_dimensions:
        logger.debug('Dimensions match exactly')
        return True

    # Embedded image within 95% of the raw width and height
    if original_image_dimensions[0] / new_image_dimensions[0] > 0.95 \
        and original_image_dimensions[1] / new_image_dimensions[1] > 0.95 \
        and new_image_dimensions[0] / original_image_dimensions[0] > 0.95 \
        and new_image_dimensions[1] / original_image_dimensions[1] > 0.95:
        logger.debug('Dimensions match closely enough')
        return True

    logger.debug('Dimensions are not good')
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


def __heif_convert_version():
    output = subprocess.Popen(['dpkg', '-s', 'libheif-examples'], stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.PIPE).communicate()[0].decode('utf-8')
    for line in output.split('\n'):
        if 'Version: ' in line:
            try:
                return re.search(r'([0-9]+.[0-9]+.[0-9]+)', line).group(1)
            except AttributeError:
                return


def __exiftool_version():
    output = subprocess.Popen(['dpkg', '-s', 'libimage-exiftool-perl'], stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.PIPE).communicate()[0].decode('utf-8')
    for line in output.split('\n'):
        if 'Version: ' in line:
            try:
                return re.search(r'([0-9]+.[0-9]+.[0-9]+)', line).group(1)
            except AttributeError:
                return

def __delete_file_silently(path):
    try:
        os.remove(path)
    except FileNotFoundError:
        pass


def generate_jpeg(path):
    logger.debug(f'Generating JPEG for raw file {path}')
    basename = os.path.basename(path)
    temp_dir = tempfile.mkdtemp()
    temp_input_path = Path(temp_dir) / basename
    shutil.copyfile(path, temp_input_path)

    valid_image = False
    process_params = None
    external_version = None

    # Handle Canon's CR3 format since their thumbnails are proprietary.
    mimetype = get_mimetype(temp_input_path)
    if mimetype == 'image/x-canon-cr3':
        logger.debug('File type detected as Canon Raw v3')
        subprocess.Popen([
            'exiftool', '-b', '-JpgFromRaw', '-w', 'jpg', '-ext', 'CR3',
            temp_input_path, '-execute', '-tagsfromfile', temp_input_path,
            '-ext', 'jpg', Path(temp_dir)],
            stdout=subprocess.PIPE,
            stdin=subprocess.PIPE,
            stderr=subprocess.PIPE).communicate()
        exiftool_output = __get_exiftool_image(temp_dir, basename)
        # Clean up the original file without tags.
        if 'original' in exiftool_output:
            os.remove(exiftool_output['original'])
        # Set the input file.
        if 'output' in exiftool_output:
            temp_output_path = exiftool_output['output']
        else:
            temp_output_path = None
        process_params = 'exiftool -b -JpgFromRaw'
        external_version = __exiftool_version()
    elif mimetype in ['image/heif', 'image/heic']:
        logger.debug('File type detected as HIEF/HEIC')
        temp_output_path = Path(temp_dir) / 'out.jpg'
        subprocess.run(['heif-convert', '-q', '90', temp_input_path, temp_output_path])
        process_params = 'heif-convert -q 90'
        external_version = __heif_convert_version()
    else:
        logger.debug('Attempting to extract JPEG using dcraw')
        # Try to extract the JPEG that might be inside the raw file
        subprocess.run(['dcraw', '-e', temp_input_path])
        temp_output_path = __get_generated_image(temp_dir, basename)
        process_params = 'dcraw -e'
        external_version = __dcraw_version()

    # Check the JPEGs dimensions are close enough to the raw's dimensions
    if temp_output_path:
        if __has_acceptable_dimensions(temp_input_path, temp_output_path):
            logger.debug('JPEG file looks good so far')
            valid_image = True
        else:
            __delete_file_silently(temp_output_path)

    # Next try to use embedded profile to generate an image
    if not valid_image:
        logger.debug('Attempting to generate JPEG with dcraw using embedded color profile')
        subprocess.run(['dcraw', '-p embed', temp_input_path])
        temp_output_path = __get_generated_image(temp_dir, basename)

        if temp_output_path:
            if __has_acceptable_dimensions(temp_input_path, temp_output_path):
                logger.debug('JPEG file looks good so far')
                valid_image = True
                process_params = 'dcraw -p embed'
            else:
                __delete_file_silently(temp_output_path)

    # Finally try to use the embedded whitebalance to generate an image
    if not valid_image:
        logger.debug('Attempting to generate JPEG with dcraw using embedded white balance')
        subprocess.run(['dcraw', '-w', temp_input_path])
        temp_output_path = __get_generated_image(temp_dir, basename)

        if temp_output_path:
            if __has_acceptable_dimensions(temp_input_path, temp_output_path, True):
                logger.debug('JPEG file looks good so far')
                valid_image = True
                process_params = 'dcraw -w'
            else:
                __delete_file_silently(temp_output_path)

    # If extracted image isn't a JPEG then we need to convert it
    if valid_image:
        valid_image = identified_as_jpeg(temp_output_path)

        if not valid_image:
            logger.debug('JPEG didn\'t pass test, attempting bitmap conversion')
            jpeg_path = tempfile.mktemp()
            bitmap_to_jpeg(temp_output_path, jpeg_path)

            if identified_as_jpeg(jpeg_path):
                logger.debug('JPEG file now passes test')
                temp_output_path = jpeg_path
                valid_image = True

    # Move the outputted file to a new temporary location
    if valid_image:
        logger.debug('I\'m happy with the JPEG so moving it to a new location')
        final_path = tempfile.mktemp()
        os.rename(temp_output_path, final_path)

    # Delete the temporary working directory
    logger.debug('Deleting temporary files')
    shutil.rmtree(temp_dir)

    if valid_image:
        logger.debug(f'Returning info about JPEG which is temporarily located here: {final_path}')
        return (final_path, RAW_PROCESS_VERSION, process_params, external_version)

    logger.error('Couldn\'t make JPEG from raw file')
    return (None, RAW_PROCESS_VERSION, None, None)
