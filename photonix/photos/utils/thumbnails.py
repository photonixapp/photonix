
import io
import os
import math
from pathlib import Path

from PIL import Image, ImageOps, ImageFile
import numpy as np

from django.conf import settings
from photonix.photos.models import Photo, PhotoFile, Task
from photonix.photos.utils.metadata import PhotoMetadata


THUMBNAILER_VERSION = 20210321


def process_generate_thumbnails_tasks():
    for task in Task.objects.filter(type='generate_thumbnails', status='P').order_by('created_at'):
        photo_id = task.subject_id
        generate_thumbnails_for_photo(photo_id, task)


def generate_thumbnails_for_photo(photo, task):
    task.start()

    if not isinstance(photo, Photo):
        try:
            photo = Photo.objects.get(id=photo)
        except Photo.DoesNotExist:
            task.failed(f'Photo instance does not exist with id={photo}')
            return

    for thumbnail in settings.THUMBNAIL_SIZES:
        if thumbnail[4]:  # Required from the start
            try:
                get_thumbnail(photo=photo, width=thumbnail[0], height=thumbnail[1], crop=thumbnail[2], quality=thumbnail[3], force_regenerate=True, force_accurate=thumbnail[5])
            except (FileNotFoundError, IndexError):
                task.failed()
                return

    if photo.thumbnailed_version < THUMBNAILER_VERSION:
        photo.thumbnailed_version = THUMBNAILER_VERSION
        photo.save()

    # Complete task for photo and add next task for classifying images if this hasn't happened previously
    if Task.objects.filter(type='classify_images', subject_id=photo.id).count() > 0:
        task.complete()
    else:
        task.complete(next_type='classify_images', next_subject_id=photo.id)


def get_thumbnail_path(photo_file_id, width=256, height=256, crop='cover', quality=75):
    directory = Path(f'{settings.THUMBNAIL_ROOT}/photofile/{width}x{height}_{crop}_q{quality}')
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f'{photo_file_id}.jpg'


def get_thumbnail_url(photo_file_id, width=256, height=256, crop='cover', quality=75):
    return f'{settings.THUMBNAIL_URL}photofile/{width}x{height}_{crop}_q{quality}/{photo_file_id}.jpg'


def get_thumbnail(photo_file=None, photo=None, width=256, height=256, crop='cover', quality=75, return_type='path', force_regenerate=False, force_accurate=False):
    if not photo_file:
        if not isinstance(photo, Photo):
            photo = Photo.objects.get(id=photo)
        photo_file = photo.base_file
    elif not isinstance(photo_file, PhotoFile):
        photo_file = PhotoFile.objects.get(id=photo_file)

    # If thumbnail image was previously generated and we weren't told to re-generate, return that one
    output_path = get_thumbnail_path(photo_file.id, width, height, crop, quality)
    output_url = get_thumbnail_url(photo_file.id, width, height, crop, quality)

    if os.path.exists(output_path):
        if return_type == 'bytes':
            return open(output_path, 'rb').read()
        elif return_type == 'url':
            return output_url
        else:
            return output_path

    # Read base image and metadata
    input_path = photo_file.base_image_path
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    im = Image.open(input_path)

    if im.mode != 'RGB':
        im = im.convert('RGB')

    metadata = PhotoMetadata(input_path)

    # Perform rotations if decalared in metadata
    if force_regenerate:
        im = im.rotate(photo_file.rotation, expand=True)
    elif metadata.get('Orientation') in ['Rotate 90 CW', 'Rotate 270 CCW']:
        im = im.rotate(-90, expand=True)
    elif metadata.get('Orientation') in ['Rotate 90 CCW', 'Rotate 270 CW']:
        im = im.rotate(90, expand=True)

    # Crop / resize
    if force_accurate:
        im = srgbResize(im, (width, height), crop, Image.BICUBIC)
    else:
        if crop == 'cover':
            im = ImageOps.fit(im, (width, height), Image.BICUBIC)
        else:
            im.thumbnail((width, height), Image.BICUBIC)

    # Save to disk (keeping the bytes in memory if we need to return them)
    if return_type == 'bytes':
        img_byte_array = io.BytesIO()
        im.save(img_byte_array, format='JPEG', quality=quality)
        with open(output_path, 'wb') as f:
            f.write(img_byte_array.getvalue())
    else:
        im.save(output_path, format='JPEG', quality=quality)

    # Update PhotoFile DB model with version of thumbnailer
    if photo_file.thumbnailed_version != THUMBNAILER_VERSION:
        photo_file.thumbnailed_version = THUMBNAILER_VERSION
        photo_file.save()

    # Return accordingly
    if return_type == 'bytes':
        return img_byte_array.getvalue()
    elif return_type == 'url':
        return output_url
    return output_path


def srgbResize(im, size, crop, resample):
    '''
    More accurate method of generating thumbnails as it is sRGB aware and has gamma correction
    See this for more info: http://entropymine.com/imageworsener/gamma/
    '''

    if crop == 'cover':
        # Adapted from Pillow's ImageOps.fit method
        bleed_pixels = (0, 0)
        live_size = (im.width, im.height)
        centering = (0.5, 0.5)
        # Calculate size based on crop and original image size
        live_size_ratio = im.width / im.height
        # calculate the aspect ratio of the output image
        output_ratio = size[0] / size[1]

        # figure out if the sides or top/bottom will be cropped off
        if live_size_ratio == output_ratio:
            # live_size is already the needed ratio
            crop_width = live_size[0]
            crop_height = live_size[1]
        elif live_size_ratio >= output_ratio:
            # live_size is wider than what's needed, crop the sides
            crop_width = output_ratio * live_size[1]
            crop_height = live_size[1]
        else:
            # live_size is taller than what's needed, crop the top and bottom
            crop_width = live_size[0]
            crop_height = live_size[0] / output_ratio

        # make the crop
        crop_left = bleed_pixels[0] + (live_size[0] - crop_width) * centering[0]
        crop_top = bleed_pixels[1] + (live_size[1] - crop_height) * centering[1]

        box = (crop_left, crop_top, crop_left + crop_width, crop_top + crop_height)

    else:  # Contain
        # Adapted from Pillow's Image.thumbnail method
        x, y = map(math.floor, size)
        if x >= im.width and y >= im.height:
            return im

        def round_aspect(number, key):
            return max(min(math.floor(number), math.ceil(number), key=key), 1)

        # preserve aspect ratio
        aspect = im.width / im.height
        if x / y >= aspect:
            x = round_aspect(y * aspect, key=lambda n: abs(aspect - n / y))
        else:
            y = round_aspect(
                x / aspect, key=lambda n: 0 if n == 0 else abs(aspect - x / n)
            )
        size = (x, y)

        box = None
        reducing_gap = 2.0
        if reducing_gap is not None:
            res = im.draft(None, (size[0] * reducing_gap, size[1] * reducing_gap))
            if res is not None:
                box = res[1]

        if im.size == size:
            return im

    # This sRGB conversion section adapted from Nathan Reed's answer on StackOverflow https://stackoverflow.com/a/31597788/1417989
    # Convert to numpy array of float
    arr = np.array(im, dtype=np.float32) / 255.0
    # Convert sRGB -> linear
    arr = np.where(arr <= 0.04045, arr/12.92, ((arr+0.055)/1.055)**2.4)
    # Resize using PIL
    arrOut = np.zeros((size[1], size[0], arr.shape[2]))
    for i in range(arr.shape[2]):
        chan = Image.fromarray(arr[:,:,i])
        chan = chan.resize(size, resample, box=box, reducing_gap=2.0)
        arrOut[:,:,i] = np.array(chan).clip(0.0, 1.0)
    # Convert linear -> sRGB
    arrOut = np.where(arrOut <= 0.0031308, 12.92*arrOut, 1.055*arrOut**(1.0/2.4) - 0.055)
    # Convert to 8-bit
    arrOut = np.uint8(np.rint(arrOut * 255.0))
    # Convert back to PIL
    return Image.fromarray(arrOut)
