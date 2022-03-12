from pathlib import Path

from django.utils import timezone
import factory

from photonix.accounts.models import User
from photonix.photos.models import Library, LibraryUser, Photo, PhotoFile, Tag, PhotoTag, Task


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = 'test'
    email = 'test@example.com'
    has_set_personal_info = True
    has_created_library = True
    has_configured_importing = True
    has_configured_image_analysis = True


class LibraryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Library

    name = factory.Sequence(lambda n: f'Test Library {n}')
    classification_color_enabled = True
    classification_location_enabled = True
    classification_style_enabled = True
    classification_object_enabled = True
    classification_face_enabled = True
    setup_stage_completed = True


class LibraryUserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = LibraryUser

    library = factory.SubFactory(LibraryFactory)
    user = factory.SubFactory(UserFactory)
    owner = True


class PhotoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Photo

    library = factory.SubFactory(LibraryFactory)


class PhotoFileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PhotoFile

    photo = factory.SubFactory(PhotoFactory)
    path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    mimetype = 'image/jpeg'
    bytes = 1000
    file_modified_at = factory.LazyAttribute(lambda o: timezone.now())


class TagFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Tag

    library = factory.SubFactory(LibraryFactory)
    name = factory.Sequence(lambda n: f'Tag {n}')


class PhotoTagFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PhotoTag

    photo = factory.SubFactory(PhotoFactory)
    tag = factory.SubFactory(TagFactory)


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    type = 'classify.style'
    status = 'P'
    library = factory.SubFactory(LibraryFactory)
