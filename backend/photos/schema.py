import graphene

from graphene_django.types import DjangoObjectType

from .models import Camera, Lens, Photo


class CameraType(DjangoObjectType):
    class Meta:
        model = Camera


class LensType(DjangoObjectType):
    class Meta:
        model = Lens


# class PhotoType(DjangoObjectType):
#     class Meta:
#         model = Photo


class Query(object):
    camera = graphene.Field(CameraType, id=graphene.String())
    all_cameras = graphene.List(CameraType)
    lens = graphene.Field(LensType, id=graphene.String(), name=graphene.String())
    all_lenses = graphene.List(LensType)
    # all_photos = graphene.List(PhotoType)

    def resolve_all_cameras(self, info, **kwargs):
        return Camera.objects.all()

    def resolve_all_lenses(self, info, **kwargs):
        return Lens.objects.all()

    def resolve_all_photos(self, info, **kwargs):
        return Photo.objects.all()
