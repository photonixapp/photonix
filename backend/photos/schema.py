from django.contrib.gis.db.models.fields import PointField
import graphene
from graphene_django.converter import convert_django_field
from graphene_django.types import DjangoObjectType

from .models import Camera, Lens, Photo, Tag


@convert_django_field.register(PointField)
def point_field_conversion(field, registry=None):
    return graphene.String()


class CameraType(DjangoObjectType):
    class Meta:
        model = Camera


class LensType(DjangoObjectType):
    class Meta:
        model = Lens


class PhotoType(DjangoObjectType):
    class Meta:
        model = Photo

    def resolve_location(self, info):
        if self.location:
            return '{},{}'.format(self.location.y, self.location.x)
        return None


class LocationTagType(DjangoObjectType):
    class Meta:
        model = Tag


class ObjectTagType(DjangoObjectType):
    class Meta:
        model = Tag


class PersonTagType(DjangoObjectType):
    class Meta:
        model = Tag


class ColorTagType(DjangoObjectType):
    class Meta:
        model = Tag


class StyleTagType(DjangoObjectType):
    class Meta:
        model = Tag


class Query(object):
    camera = graphene.Field(CameraType, id=graphene.String(), make=graphene.String(), model=graphene.String())
    all_cameras = graphene.List(CameraType)
    lens = graphene.Field(LensType, id=graphene.String(), name=graphene.String())
    all_lenses = graphene.List(LensType)
    photo = graphene.Field(PhotoType, id=graphene.String())
    all_photos = graphene.List(PhotoType)
    all_location_tags = graphene.List(LocationTagType)
    all_object_tags = graphene.List(ObjectTagType)
    all_person_tags = graphene.List(PersonTagType)
    all_color_tags = graphene.List(ColorTagType)
    all_style_tags = graphene.List(StyleTagType)

    def resolve_camera(self, info, **kwargs):
        id = kwargs.get('id')
        make = kwargs.get('make')
        model = kwargs.get('model')

        if id is not None:
            return Camera.objects.get(pk=id)

        if make is not None and model is not None:
            return Camera.objects.get(make=make, model=model)

        return None

    def resolve_all_cameras(self, info, **kwargs):
        return Camera.objects.all()

    def resolve_lens(self, info, **kwargs):
        id = kwargs.get('id')
        name = kwargs.get('name')

        if id is not None:
            return Lens.objects.get(pk=id)

        if name is not None:
            return Lens.objects.get(name=name)

        return None

    def resolve_all_lenses(self, info, **kwargs):
        return Lens.objects.all()

    def resolve_photo(self, info, **kwargs):
        id = kwargs.get('id')
        if id is not None:
            return Photo.objects.get(pk=id)
        return None

    def resolve_all_photos(self, info, **kwargs):
        return Photo.objects.all()

    def resolve_all_location_tags(self, info, **kwargs):
        return Tag.objects.filter(type='L')

    def resolve_all_object_tags(self, info, **kwargs):
        return Tag.objects.filter(type='O')

    def resolve_all_person_tags(self, info, **kwargs):
        return Tag.objects.filter(type='P')

    def resolve_all_color_tags(self, info, **kwargs):
        return Tag.objects.filter(type='C')

    def resolve_all_style_tags(self, info, **kwargs):
        return Tag.objects.filter(type='S')
