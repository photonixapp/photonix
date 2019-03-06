import re
from uuid import UUID


def get_or_create_tag(name, type, source, parent=None):
    # get_or_create is not atomic so an instance could get created by another thread inbetween.
    # This causes an IntegrityError due to the unique_together constraint.
    from django.db import IntegrityError, transaction
    from photos.models import Tag

    try:
        with transaction.atomic():
            tag, _ = Tag.objects.get_or_create(name=name, type=type, source=source, parent=parent)
    except IntegrityError:
        tag = Tag.objects.get(name=name, type=type, source=source, parent=parent)
    return tag


def results_for_model_on_photo(model, photo_id):
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
        return None, model.predict(photo_id)

    # Is a Photo model instance so needs saving
    if not photo:
        from photos.models import Photo, PhotoTag
        photo = Photo.objects.get(id=photo_id)

    results = model.predict(photo.base_file.path)

    return is_photo_instance and photo or None, results
