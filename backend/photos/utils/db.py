from datetime import datetime
from decimal import Decimal
import json
import mimetypes
import os

from django.utils.timezone import utc

from photos.models import Camera, Lens, Photo, PhotoFile
from photos.utils.metadata import PhotoMetadata, parse_datetime, get_datetime, parse_gps_location


def record_photo(path):
    file_modified_at = datetime.fromtimestamp(os.stat(path).st_mtime, tz=utc)

    try:
        photo_file = PhotoFile.objects.get(path=path)
    except PhotoFile.DoesNotExist:
        photo_file = PhotoFile()

    if photo_file and photo_file.file_modified_at == file_modified_at:
        return False

    metadata = PhotoMetadata(path)
    date_taken = parse_datetime(metadata.get('Date/Time Original'))

    camera = None
    camera_make = metadata.get('Make')
    camera_model = metadata.get('Camera Model Name')
    if camera_model:
        camera_model = camera_model.replace(camera_make, '').strip()
    if camera_make and camera_model:
        try:
            camera = Camera.objects.get(make=camera_make, model=camera_model)
            if date_taken < camera.earliest_photo:
                camera.earliest_photo = date_taken
                camera.save()
            if date_taken > camera.latest_photo:
                camera.latest_photo = date_taken
                camera.save()
        except Camera.DoesNotExist:
            camera = Camera(make=camera_make, model=camera_model, earliest_photo=date_taken, latest_photo=date_taken)
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
            lens = Lens(name=lens_name, earliest_photo=date_taken, latest_photo=date_taken)
            lens.save()

    photo = None
    if date_taken:
        try:
            # TODO: Match on file number/file name as well
            photo = Photo.objects.get(taken_at=date_taken)
        except Photo.DoesNotExist:
            pass

    latitude = None
    longitude = None
    if metadata.get('GPS Position'):
        latitude, longitude = parse_gps_location(metadata.get('GPS Position'))


    if not photo:
        # Save Photo
        photo = Photo(
            taken_at=date_taken,
            taken_by=metadata.get('Artist') or None,
            aperture=metadata.get('Aperture') and Decimal(metadata.get('Aperture')) or None,
            exposure=metadata.get('Exposure Time') or None,
            iso_speed=metadata.get('ISO') and int(metadata.get('ISO')) or None,
            focal_length=metadata.get('Focal Length') and metadata.get('Focal Length').split(' ', 1)[0] or None,
            flash=metadata.get('Flash') and 'on' in metadata.get('Flash').lower() or False,
            metering_mode=metadata.get('Metering Mode') or None,
            drive_mode=metadata.get('Drive Mode') or None,
            shooting_mode=metadata.get('Shooting Mode') or None,
            camera=camera,
            lens=lens,
            latitude=latitude,
            longitude=longitude,
            altitude=metadata.get('GPS Altitude') and metadata.get('GPS Altitude').split(' ')[0]
        )
        photo.save()

    # Save PhotoFile
    photo_file.photo = photo
    photo_file.path             = path
    photo_file.width            = metadata.get('Image Width')
    photo_file.height           = metadata.get('Image Height')
    photo_file.mimetype         = mimetypes.guess_type(path)[0]
    photo_file.file_modified_at = file_modified_at
    photo_file.bytes            = os.stat(path).st_size
    photo_file.preferred        = False  # TODO
    photo_file.save()

    return photo
