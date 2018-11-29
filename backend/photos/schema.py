from django.contrib.gis.db.models.fields import PointField
import django_filters
import graphene
from graphene import Node
from graphene_django.converter import convert_django_field
from graphene_django.types import DjangoObjectType
from graphene_django.filter import DjangoFilterConnectionField

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


class CustomNode(graphene.Node):

    class Meta:
        name = 'Node'

    @staticmethod
    def to_global_id(type, id):
        return id


class PhotoInterface(graphene.Interface):
    photo_tags__tag__id = graphene.String()


class PhotoNode(DjangoObjectType):
    path = graphene.String()

    class Meta:
        model = Photo
        interfaces = (CustomNode, PhotoInterface)

    def resolve_location(self, info):
        if self.location:
            return '{},{}'.format(self.location.y, self.location.x)
        return None

    def resolve_path(self, info):
        return self.file.path


class PhotoFilter(django_filters.FilterSet):

    class Meta:
        model = Photo
        fields = {
            'aperture': ['exact'],
            'camera__id': ['exact'],
            'camera__make': ['exact', 'icontains'],
            'lens__id': ['exact'],
            'photo_tags__tag__id': ['exact', 'in'],
            'photo_tags__tag__name': ['exact', 'icontains', 'in'],
        }


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
    camera = graphene.Field(CameraType, id=graphene.UUID(), make=graphene.String(), model=graphene.String())
    all_cameras = graphene.List(CameraType)

    lens = graphene.Field(LensType, id=graphene.UUID(), name=graphene.String())
    all_lenses = graphene.List(LensType)

    photo = graphene.Field(PhotoNode, id=graphene.UUID())
    all_photos = DjangoFilterConnectionField(PhotoNode, filterset_class=PhotoFilter)

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
