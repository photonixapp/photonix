import os
import re
from time import sleep
from uuid import UUID


def get_or_create_tag(library, name, type, source, parent=None, ordering=None):
    # get_or_create is not atomic so an instance could get created by another thread inbetween.
    # This causes an IntegrityError due to the unique_together constraint.
    from django.db import IntegrityError
    from photonix.photos.models import Tag

    while True:
        try:
            tag, _ = Tag.objects.get_or_create(library=library, name=name, type=type, source=source, parent=parent, ordering=ordering)
            break
        except IntegrityError:
            sleep(1)
    return tag


def get_photo_by_any_type(photo_id, model=None):
    is_photo_instance = False
    photo = None

    if isinstance(photo_id, UUID):
        is_photo_instance = True
    elif isinstance(photo_id, str):
        if re.match(r'\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b', photo_id):  # Is UUID
            is_photo_instance = True
    elif hasattr(photo_id, 'id'):
        photo = photo_id

    # Is an individual filename so return the prediction
    if not is_photo_instance:
        return None

    # Is a Photo model instance so needs saving
    if not photo:
        # Handle running scripts from command line and Photo IDs
        if not os.environ.get('DJANGO_SETTINGS_MODULE'):
            os.environ.setdefault("DJANGO_SETTINGS_MODULE", "photonix.web.settings")
            import django
            django.setup()

        from photonix.photos.models import Photo
        photo = Photo.objects.get(id=photo_id)

    return is_photo_instance and photo or None


def results_for_model_on_photo(model, photo_id):
    photo = get_photo_by_any_type(photo_id, model)
    if photo:
        results = model.predict(photo.base_image_path)
    else:
        results = model.predict(photo_id)
    return photo, results
