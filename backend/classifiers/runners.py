from django.utils import timezone

from .color import ColorModel
from .object import ObjectModel
from .style import StyleModel
from photos.models import Photo, Tag, PhotoTag


def run_classifiers_on_photo(photo_id):
    run_color_classifier_on_photo(photo_id)
    run_object_classifier_on_photo(photo_id)
    run_style_classifier_on_photo(photo_id)


def run_color_classifier_on_photo(photo_id):
    color_model = ColorModel()
    photo = Photo.objects.get(id=photo_id)
    results = color_model.predict(photo.file.path)
    for name, score in results:
        if not photo.photo_tags.filter(tag__name=name, tag__type='C', tag__source='C'):
            tag, created = Tag.objects.get_or_create(name=name, type='C', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=score).save()
    photo.last_tagged_objects_completed_at = timezone.now()
    photo.last_tagged_objects_version = getattr(color_model, 'version', 0)
    photo.save()


def run_object_classifier_on_photo(photo_id):
    object_model = ObjectModel()
    photo = Photo.objects.get(id=photo_id)
    results = object_model.predict(photo.file.path)
    for result in results:
        if not photo.photo_tags.filter(tag__name=result['label'], tag__type='O', tag__source='C'):
            tag, created = Tag.objects.get_or_create(name=result['label'], type='O', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=result['score'], position_x=result['x'], position_y=result['y'], size_x=result['width'], size_y=result['height']).save()
    photo.last_tagged_objects_completed_at = timezone.now()
    photo.last_tagged_objects_version = getattr(object_model, 'version', 0)
    photo.save()


def run_style_classifier_on_photo(photo_id):
    style_model = StyleModel()
    photo = Photo.objects.get(id=photo_id)
    results = style_model.predict(photo.file.path)
    for name, score in results:
        if not photo.photo_tags.filter(tag__name=name, tag__type='S', tag__source='C'):
            tag, created = Tag.objects.get_or_create(name=name, type='S', source='C')
            PhotoTag(photo=photo, tag=tag, source='C', confidence=score).save()
    photo.last_tagged_styles_completed_at = timezone.now()
    photo.last_tagged_styles_version = getattr(style_model, 'version', 0)
    photo.save()
