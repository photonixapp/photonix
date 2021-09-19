from datetime import datetime
from decimal import Decimal
import imghdr
import mimetypes
import os, time
import re
import subprocess

from django.utils.timezone import utc

from photonix.photos.models import Camera, Lens, Photo, PhotoFile, Task, Library, Tag, PhotoTag
from photonix.photos.utils.metadata import PhotoMetadata, parse_datetime, parse_gps_location, get_mimetype
from photonix.web.utils import logger


MIMETYPE_WHITELIST = [
    # This list is in addition to the filetypes detected by imghdr and 'dcraw -i'
    'image/heif',
    'image/heif-sequence',
    'image/heic',
    'image/heic-sequence',
    'image/avif',
    'image/avif-sequence',
]


def record_photo(path, library, inotify_event_type=None):
    logger.info(f'Recording photo {path}')

    mimetype = get_mimetype(path)

    if not imghdr.what(path) and not mimetype in MIMETYPE_WHITELIST and subprocess.run(['dcraw', '-i', path]).returncode:
        logger.error(f'File is not a supported type: {path} ({mimetype})')
        return None

    if type(library) == Library:
        library_id = library.id
    else:
        library_id = str(library)
    try:
        photo_file = PhotoFile.objects.get(path=path)
    except PhotoFile.DoesNotExist:
        photo_file = PhotoFile()

    if inotify_event_type in ['DELETE', 'MOVED_FROM']: 
        if PhotoFile.objects.filter(path=path).exists():
            return delete_photo_record(photo_file)
        else:
            return True

    file_modified_at = datetime.fromtimestamp(os.stat(path).st_mtime, tz=utc)

    if photo_file and photo_file.file_modified_at == file_modified_at:
        return True

    metadata = PhotoMetadata(path)
    date_taken = None
    possible_date_keys = ['Create Date', 'Date/Time Original', 'Date Time Original', 'Date/Time', 'Date Time', 'GPS Date/Time', 'File Modification Date/Time']
    for date_key in possible_date_keys:
        date_taken = parse_datetime(metadata.get(date_key))
        if date_taken:
            break
    # If EXIF data not found.
    date_taken = date_taken or datetime.strptime(time.ctime(os.path.getctime(path)), "%a %b %d %H:%M:%S %Y")

    camera = None
    camera_make = metadata.get('Make', '')[:Camera.make.field.max_length]
    camera_model = metadata.get('Camera Model Name', '')
    if camera_model:
        camera_model = camera_model.replace(camera_make, '').strip()
    camera_model = camera_model[:Camera.model.field.max_length]
    if camera_make and camera_model:
        try:
            camera = Camera.objects.get(library_id=library_id, make=camera_make, model=camera_model)
            if date_taken < camera.earliest_photo:
                camera.earliest_photo = date_taken
                camera.save()
            if date_taken > camera.latest_photo:
                camera.latest_photo = date_taken
                camera.save()
        except Camera.DoesNotExist:
            camera = Camera(library_id=library_id, make=camera_make, model=camera_model,
                            earliest_photo=date_taken, latest_photo=date_taken)
            camera.save()

    lens = None
    lens_name = metadata.get('Lens ID')
    if lens_name:
        try:
            lens = Lens.objects.get(name=lens_name)
            if date_taken < lens.earliest_photo:
                lens.earliest_photo = date_taken
                lens.save()
            if date_taken > lens.latest_photo:
                lens.latest_photo = date_taken
                lens.save()
        except Lens.DoesNotExist:
            lens = Lens(library_id=library_id, name=lens_name, earliest_photo=date_taken,
                        latest_photo=date_taken)
            lens.save()

    photo = None
    if date_taken:
        try:
            # Fix for issue 347: Photos with the same date are not imported ...
            photo_set = Photo.objects.filter(taken_at=date_taken)
            file_found = False
            if photo_set:
                for photo_entry in photo_set:
                    if PhotoFile.objects.get(photo_id=photo_entry).base_image_path == path:
                        file_found = True
                        photo = photo_entry
                        break
            if not file_found:
                photo = None
        except Photo.DoesNotExist:
            pass

    latitude = None
    longitude = None
    if metadata.get('GPS Position'):
        latitude, longitude = parse_gps_location(metadata.get('GPS Position'))

    iso_speed = None
    if metadata.get('ISO'):
        try:
            iso_speed = int(re.search(r'[0-9]+', metadata.get('ISO')).group(0))
        except AttributeError:
            pass
    if not photo:
        # Save Photo
        aperture = None
        aperturestr = metadata.get('Aperture')
        if aperturestr:
            try:
                aperture = Decimal(aperturestr)
                if aperture.is_infinite():
                    aperture = None
            except:
                pass

        photo = Photo(
            library_id=library_id,
            taken_at=date_taken,
            taken_by=metadata.get('Artist', '')[:Photo.taken_by.field.max_length] or None,
            aperture=aperture,
            exposure=metadata.get('Exposure Time', '')[:Photo.exposure.field.max_length] or None,
            iso_speed=iso_speed,
            focal_length=metadata.get('Focal Length') and metadata.get('Focal Length').split(' ', 1)[0] or None,
            flash=metadata.get('Flash') and 'on' in metadata.get('Flash').lower() or False,
            metering_mode=metadata.get('Metering Mode', '')[:Photo.metering_mode.field.max_length] or None,
            drive_mode=metadata.get('Drive Mode', '')[:Photo.drive_mode.field.max_length] or None,
            shooting_mode=metadata.get('Shooting Mode', '')[:Photo.shooting_mode.field.max_length] or None,
            camera=camera,
            lens=lens,
            latitude=latitude,
            longitude=longitude,
            altitude=metadata.get('GPS Altitude') and metadata.get('GPS Altitude').split(' ')[0],
            star_rating=metadata.get('Rating')
        )
        photo.save()

        for subject in metadata.get('Subject', '').split(','):
            subject = subject.strip()
            if subject:
                tag, _ = Tag.objects.get_or_create(library_id=library_id, name=subject, type="G")
                PhotoTag.objects.create(
                    photo=photo,
                    tag=tag,
                    confidence=1.0
            )
    else:
        for photo_file in photo.files.all():
            if not os.path.exists(photo_file.path):
                photo_file.delete()

    width = metadata.get('Image Width')
    height = metadata.get('Image Height')
    if metadata.get('Orientation') in ['Rotate 90 CW', 'Rotate 270 CCW', 'Rotate 90 CCW', 'Rotate 270 CW']:
        old_width = width
        width = height
        height = old_width

    # Save PhotoFile
    photo_file.photo = photo
    photo_file.path = path
    photo_file.width = width
    photo_file.height = height
    photo_file.mimetype = mimetype
    photo_file.file_modified_at = file_modified_at
    photo_file.bytes = os.stat(path).st_size
    photo_file.preferred = False  # TODO
    photo_file.save()

    # Create task to ensure JPEG version of file exists (used for thumbnailing, analysing etc.)
    Task(
        type='ensure_raw_processed',
        subject_id=photo.id,
        complete_with_children=True,
        library=photo.library
    ).save()

    return photo


def delete_photo_record(photo_file_obj):
    """Delete photo record if photo not exixts on library path."""
    delete_photofile_and_photo_record(photo_file_obj)
    Tag.objects.filter(photo_tags=None).delete()
    Camera.objects.filter(photos=None).delete()
    Lens.objects.filter(photos=None).delete()
    return True


def move_or_rename_photo(photo_old_path, photo_new_path, library_id):
    """Rename a photoFile or change the path while moving photo in child directory."""
    try:
        photo_file = PhotoFile.objects.get(path=photo_old_path)
        photo_file.path = photo_new_path
        photo_file.save()
        return photo_file
    except Exception as e:
        return True


def delete_child_dir_all_photos(directory_path, library_id):
    """When a child directory deleted it delete all the photo records of that directory."""
    for photo_file_obj in PhotoFile.objects.filter(path__startswith=directory_path):
        delete_photofile_and_photo_record(photo_file_obj)
    Tag.objects.filter(photo_tags=None).delete()
    Camera.objects.filter(photos=None).delete()
    Lens.objects.filter(photos=None).delete()
    return True


def delete_photofile_and_photo_record(photo_file_obj):
    """Delete photoFile object with its photo object."""
    photo_obj = photo_file_obj.photo
    photo_file_obj.delete()
    if not photo_obj.files.all():
        photo_obj.delete()
