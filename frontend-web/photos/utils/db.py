from photos.models import Camera, Lens, Photo, PhotoFile
from photos.utils.metadata import PhotoMetadata, parse_datetime


def record_photo(path):
    metadata = PhotoMetadata(path)

    camera_make = metadata.get('Make')
    camera_model = metadata.get('Camera Model Name')
    if camera_model:
        camera_model = camera_model.replace(camera_make, '').strip()
    date_taken = parse_datetime(metadata.get('Date/Time Original'))

    try:
        camera = Camera.objects.get(manufacturer=camera_make, model=camera_model)
        if date_taken < camera.earliest_photo:
            camera.earliest_photo = date_taken
            camera.save()
        if date_taken > camera.latest_photo:
            camera.latest_photo = date_taken
            camera.save()
    except Camera.DoesNotExist:
        camera = Camera(manufacturer=camera_make, model=camera_model, earliest_photo=date_taken, latest_photo=date_taken)
        camera.save()
