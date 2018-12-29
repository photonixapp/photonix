from django.db import IntegrityError, transaction
from django.utils import timezone

from .color import ColorModel
from .object import ObjectModel
from .style import StyleModel
from photos.models import Photo, Tag, PhotoTag


def run_classifiers_on_photo(photo_id):
    run_color_classifier_on_photo(photo_id)
    run_object_classifier_on_photo(photo_id)
    run_style_classifier_on_photo(photo_id)


def _get_or_create_tag(name, type, source):
    # get_or_create is not atomic so an instance could get created by another thread inbetween.
    # This causes an IntegrityError due to the unique_together constraint.
    try:
        with transaction.atomic():
            tag, _ = Tag.objects.get_or_create(name=name, type=type, source=source)
    except IntegrityError:
        tag = Tag.objects.get(name=name, type=type, source=source)
    return tag

def run_color_classifier_on_photo(photo_id):
    color_model = ColorModel()
    photo = Photo.objects.get(id=photo_id)
    results = color_model.predict(photo.file.path)
    for name, score in results:
        if not photo.photo_tags.filter(tag__name=name, tag__type='C', tag__source='C'):
            tag = _get_or_create_tag(name=name, type='C', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=score, significance=score).save()
    photo.classifier_color_completed_at = timezone.now()
    photo.classifier_color_version = getattr(color_model, 'version', 0)
    photo.save()


def run_object_classifier_on_photo(photo_id):
    object_model = ObjectModel()
    photo = Photo.objects.get(id=photo_id)
    results = object_model.predict(photo.file.path)
    for result in results:
        if not photo.photo_tags.filter(tag__name=result['label'], tag__type='O', tag__source='C'):
            tag = _get_or_create_tag(name=result['label'], type='O', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=result['score'], significance=result['significance'], position_x=result['x'], position_y=result['y'], size_x=result['width'], size_y=result['height']).save()
    photo.classifier_object_completed_at = timezone.now()
    photo.classifier_object_version = getattr(object_model, 'version', 0)
    photo.save()


def run_style_classifier_on_photo(photo_id):
    style_model = StyleModel()
    photo = Photo.objects.get(id=photo_id)
    results = style_model.predict(photo.file.path)
    for name, score in results:
        if not photo.photo_tags.filter(tag__name=name, tag__type='S', tag__source='C'):
            tag = _get_or_create_tag(name=name, type='S', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=score, significance=score).save()
    photo.classifier_style_completed_at = timezone.now()
    photo.classifier_style_version = getattr(style_model, 'version', 0)
    photo.save()
