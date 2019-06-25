import datetime
import mimetypes
import os
import uuid
from decimal import Decimal

import pytz
import sqlalchemy as sa
from photonix.models import Base
from photonix.photos.utils.metadata import (PhotoMetadata, parse_datetime,
                                            parse_gps_location)

utc=pytz.UTC

def record_photo(conn, path):
    file_modified_at = datetime.datetime.fromtimestamp(os.stat(path).st_mtime)
    PhotoFile = Base.metadata.tables['photos_photofile']
    Photo = Base.metadata.tables['photos_photo']
    Camera = Base.metadata.tables['photos_camera']
    Lens = Base.metadata.tables['photos_lens']
    stmt = sa.select([PhotoFile]).where(PhotoFile.c.path == str(path))
    res = conn.execute(stmt)
    photo_file = dict(zip(res.keys(), res.fetchone() or []))
    if photo_file and photo_file['file_modified_at'] == file_modified_at:
        return False

    metadata = PhotoMetadata(path)
    date_taken = parse_datetime(metadata.get('Date/Time Original'))

    camera = None
    camera_make = metadata.get('Make')
    camera_model = metadata.get('Camera Model Name')
    if camera_model:
        camera_model = camera_model.replace(camera_make, '').strip()
    if camera_make and camera_model:
        stmt = sa.select([Camera]).where(Camera.c.make == camera_make).where(Camera.c.model == camera_model)
        res = conn.execute(stmt)
        camera_row = res.fetchone()
        if camera_row:
            camera = dict(zip(res.keys(), camera_row))
            camera_id = camera['id']
            earliest_photo = utc.localize(camera['earliest_photo'])
            latest_photo = utc.localize(camera['latest_photo'])
            if  earliest_photo > date_taken > latest_photo:
                pass
            else:
                camera['earliest_photo'] = min([date_taken, earliest_photo])
                camera['latest_photo'] = max([date_taken, latest_photo])
                conn.execute(Camera.update().where(Camera.c.id == camera_id),
                             earliest_photo=camera['earliest_photo'],
                             latest_photo=camera['latest_photo'],
                             updated_at=datetime.datetime.utcnow(),
                )
        else:
            camera_id = str(uuid.uuid4())
            conn.execute(Camera.insert(),
                         id=camera_id,
                         make=camera_make,
                         model=camera_model,
                         updated_at=datetime.datetime.utcnow(),
                         created_at=datetime.datetime.utcnow(),
                         earliest_photo=date_taken,
                         latest_photo=date_taken)

    lens = None
    lens_name = metadata.get('Len ID')
    if lens_name:
        stmt = sa.select([Lens]).where(Lens.c.name == lens_name)
        res = conn.execute(stmt)
        lens_row = res.fetchone()
        if lens_row:
            lens = dict(zip(res.keys(), lens_row))
            lens_id = lens['id']
            earliest_photo = utc.localize(lens['earliest_photo'])
            latest_photo = utc.localize(lens['latest_photo'])
            if  earliest_photo > date_taken > latest_photo:
                pass
            else:
                lens['earliest_photo'] = min([date_taken, earliest_photo])
                lens['latest_photo'] = max([date_taken, latest_photo])
                conn.execute(Lens.update().where(Lens.c.id == lens_id),
                             earliest_photo=lens['earliest_photo'],
                             latest_photo=lens['latest_photo'],
                             updated_at=datetime.datetime.utcnow(),
                )
        else:
            lens_id = str(uuid.uuid4())
            conn.execute(Lens.insert(),
                         id=lens_id,
                         updated_at=datetime.datetime.utcnow(),
                         created_at=datetime.datetime.utcnow(),
                         earliest_photo=date_taken,
                         latest_photo=date_taken)

    photo = None
    if date_taken:
        stmt = sa.select([Photo]).where(Photo.c.taken_at == date_taken)
        res = conn.execute(stmt)
        photo_row = res.fetchone()
        if photo_row:
            photo = dict(zip(res.keys(), photo_row))

    latitude = None
    longitude = None
    if metadata.get('GPS Position'):
        latitude, longitude = parse_gps_location(metadata.get('GPS Position'))

    if photo is None:
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

        photo_id = str(uuid.uuid4())
        conn.execute(Photo.insert(),
                     id=photo_id,
                     taken_at=date_taken,
                     taken_by=metadata.get('Artist'),
                     updated_at=datetime.datetime.utcnow(),
                     created_at=datetime.datetime.utcnow(),
                     aperture=aperture,
                     exposure=metadata.get('Exposure Time'),
                     iso_speed=metadata.get('ISO') and int(metadata.get('ISO')) or None,
                     focal_length=metadata.get('Focal Length') and metadata.get('Focal Length').split(' ', 1)[0] or None,
                     flash=metadata.get('Flash') and 'on' in metadata.get('Flash').lower() or False,
                     metering_mode=metadata.get('Metering Mode'),
                     drive_mode=metadata.get('Drive Mode'),
                     shooting_mode=metadata.get('Shooting Mode'),
                     visible=True,
                     camera=camera,
                     lens=lens,
                     latitude=latitude,
                     longitude=longitude,
                     altitude=metadata.get('GPS Altitude') and metadata.get('GPS Altitude').split(' ')[0])
    else:
        photo_id = photo['id']

    width = metadata.get('Image Width')
    height = metadata.get('Image Height')
    if metadata.get('Orientation') in [
            'Rotate 90 CW', 'Rotate 270 CCW', 'Rotate 90 CCW', 'Rotate 270 CW'
    ]:
        old_width = width
        width = height
        height = old_width

    # Save PhotoFile
    photofile_id = uuid.uuid4()
    conn.execute(PhotoFile.insert(),
                 id=str(photofile_id),
                 photo_id=photo_id,
                 path=path.as_posix(),
                 created_at=datetime.datetime.utcnow(),
                 updated_at=datetime.datetime.utcnow(),
                 width=width,
                 height=height,
                 mimetype=mimetypes.guess_type(path.as_posix())[0],
                 file_modified_at=file_modified_at,
                 bytes=path.stat().st_size,
                 raw_processed=False,
                 preferred=False)
    # Create task to ensure JPEG version of file exists (used for thumbnailing, analysing etc.)
    # Task(type='ensure_raw_processed', subject_id=photo.id, complete_with_children=True).save()
    return photo
