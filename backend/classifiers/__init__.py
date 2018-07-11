import os

from .style import StyleModel
from .object import ObjectModel

if os.environ.get('DJANGO_SETTINGS_MODULE'):
    from photos.models import Photo, Tag, PhotoTag

    STYLE_MODEL = StyleModel()
    OBJECT_MODEL = ObjectModel()

    def run_classifiers_on_photo(photo_id):
        photo = Photo.objects.get(id=photo_id)
        run_style_classifier_on_photo(photo)

    def run_style_classifier_on_photo(photo):
        styles = STYLE_MODEL.predict(photo.file.path)
        for name, score in styles:
            if not photo.photo_tags.filter(tag__name=name, tag__type='S', tag__source='C'):
                tag, created = Tag.objects.get_or_create(name=name, type='S', source='C')
                PhotoTag(photo=photo, tag=tag, source='C', confidence=score).save()