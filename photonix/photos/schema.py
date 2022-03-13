import os

from django.conf import settings
from django.contrib.auth import get_user_model, load_backend, login
from django.db.models import Case, When, Value, IntegerField
import django_filters
from django_filters import CharFilter, OrderingFilter
import graphene
from graphene_django.filter import DjangoFilterConnectionField
from graphene_django.types import DjangoObjectType
from graphql_jwt.decorators import login_required
from graphql import GraphQLError

from photonix.photos.utils.tasks import count_remaining_task
from .models import Library, Camera, Lens, Photo, Tag, PhotoTag, LibraryPath, LibraryUser, PhotoFile, Task
from photonix.photos.utils.filter_photos import filter_photos_queryset, sort_photos_exposure
from photonix.photos.utils.metadata import PhotoMetadata
from django.db.models.functions import Lower

User = get_user_model()


class LibraryType(DjangoObjectType):
    class Meta:
        model = Library


class CameraType(DjangoObjectType):
    class Meta:
        model = Camera


class LensType(DjangoObjectType):
    class Meta:
        model = Lens


class PhotoTagType(DjangoObjectType):
    show_verify_icon = graphene.Boolean()

    class Meta:
        model = PhotoTag

    def resolve_show_verify_icon(self, info):
        if self.tag.type == 'F' and not self.verified and self.tag.photo_tags.filter(verified=True).exists():
            return True
        return False

class PhotoFileType(DjangoObjectType):
    class Meta:
        model = PhotoFile


class CustomNode(graphene.Node):

    class Meta:
        name = 'Node'

    @staticmethod
    def to_global_id(type, id):
        return id

class PhotoInterface(graphene.Interface):
    photo_tags__tag__id = graphene.String()
    multi_filter = graphene.String()


class PhotoNode(DjangoObjectType):
    url = graphene.String()
    location = graphene.List(graphene.Float)
    width = graphene.Int()
    height = graphene.Int()
    generic_tags = graphene.List(PhotoTagType)
    photo_file = graphene.List(PhotoFileType)
    base_file_path = graphene.String()
    base_file_id = graphene.UUID()
    rotation = graphene.Int()
    download_url = graphene.String()

    color_tags = graphene.List(PhotoTagType)
    location_tags = graphene.List(PhotoTagType)
    person_tags = graphene.List(PhotoTagType)
    style_tags = graphene.List(PhotoTagType)
    object_tags = graphene.List(PhotoTagType)
    event_tags = graphene.List(PhotoTagType)

    class Meta:
        model = Photo
        interfaces = (CustomNode, PhotoInterface)

    def resolve_location(self, info):
        if self.latitude and self.longitude:
            return [self.latitude, self.longitude]
        return None

    def resolve_url(self, info):
        size = settings.THUMBNAIL_SIZES[-1]
        return self.thumbnail_url(size)

    def resolve_width(self, info):
        return self.dimensions[0]

    def resolve_height(self, info):
        return self.dimensions[1]

    def resolve_generic_tags(self, info):
        return self.photo_tags.filter(tag__type='G')

    def resolve_photo_file(self, info):
        return self.files.all().order_by('-file_modified_at')

    def resolve_base_file_path(self, info):
        return self.base_file.path

    def resolve_base_file_id(self, info):
        return self.base_file.id

    def resolve_rotation(self, info):
        return getattr(self.base_file, 'rotation', 0)

    def resolve_download_url(self, info):
        return self.download_url

    def resolve_color_tags(self, info):
        return self.photo_tags.filter(tag__type='C')

    def resolve_location_tags(self, info):
        return self.photo_tags.filter(tag__type='L')

    def resolve_person_tags(self, info):
        return self.photo_tags.filter(tag__type='F')

    def resolve_style_tags(self, info):
        return self.photo_tags.filter(tag__type='S')

    def resolve_object_tags(self, info):
        return self.photo_tags.filter(tag__type='O')

    def resolve_event_tags(self, info):
        return self.photo_tags.filter(tag__type='E')


class PhotoFilter(django_filters.FilterSet):
    multi_filter = CharFilter(method='multi_filter_filter')

    class Meta:
        model = Photo
        fields = {
            'aperture': ['exact'],
            'camera__id': ['exact'],
            'camera__make': ['exact', 'icontains'],
            'lens__id': ['exact'],
            'photo_tags__tag__id': ['exact', 'in', 'icontains'],
            'photo_tags__tag__name': ['exact', 'icontains', 'in'],
            'library__id': ['exact'],
            'id': ['exact'],
        }

    def sanitize(self, value_list):
        return [v for v in value_list if v != '' and v not in ['in', 'near', 'during', 'taken', 'on', 'of']]  # Remove empty items

    def customize(self, value):
        return value

    def multi_filter_filter(self, queryset, name, value):
        if 'library_id:' not in value:
            raise GraphQLError('library_id not supplied!')
        filters = value.split(' ')
        filters = self.sanitize(filters)
        # filters = map(self.customize, filters)
        photos_list = filter_photos_queryset(filters, queryset)
        return photos_list


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


class EventTagType(DjangoObjectType):
    class Meta:
        model = Tag


class LibrarySetting(graphene.ObjectType):
    """To pass fields for library setting query api."""

    library = graphene.Field(LibraryType)
    source_folder = graphene.String()

class PhotoMetadataFields(graphene.ObjectType):
    """ Metadata about photo as extracted by exiftool """
    data = graphene.types.generic.GenericScalar()
    ok = graphene.Boolean()

class TagNode(DjangoObjectType):

    photos_count = graphene.Int()
    cover_image = graphene.Field(PhotoNode)

    class Meta:
        model = Tag
        filter_fields = {
            'name': ['exact', 'icontains', 'istartswith'],
        }
        order_by = OrderingFilter(
            fields=(
                ('name'),
            )
        )
        interfaces = (CustomNode, PhotoInterface)

    def resolve_photos_count(self, info):
        return self.photo_tags.count()

    def resolve_cover_image(self, info):
        if self.photo_tags.count():
            return self.photo_tags.order_by('-photo__taken_at')[0].photo
        return None

class TaskType(graphene.ObjectType):
    """Different type of tasks."""

    generate_thumbnails = graphene.types.generic.GenericScalar()
    process_raw = graphene.types.generic.GenericScalar()
    classify_color = graphene.types.generic.GenericScalar()
    classify_location = graphene.types.generic.GenericScalar()
    classify_object = graphene.types.generic.GenericScalar()
    classify_style = graphene.types.generic.GenericScalar()
    classify_face = graphene.types.generic.GenericScalar()


class Query(graphene.ObjectType):
    all_libraries = graphene.List(LibraryType)
    camera = graphene.Field(CameraType, id=graphene.UUID(), make=graphene.String(), model=graphene.String())
    all_cameras = graphene.List(CameraType, library_id=graphene.UUID())

    lens = graphene.Field(LensType, id=graphene.UUID(), name=graphene.String())
    all_lenses = graphene.List(LensType, library_id=graphene.UUID())

    all_apertures = graphene.List(graphene.Float, library_id=graphene.UUID())
    all_exposures = graphene.List(graphene.String, library_id=graphene.UUID())
    all_iso_speeds = graphene.List(graphene.Int, library_id=graphene.UUID())
    all_focal_lengths = graphene.List(graphene.Float, library_id=graphene.UUID())
    all_metering_modes = graphene.List(graphene.String, library_id=graphene.UUID())
    all_drive_modes = graphene.List(graphene.String, library_id=graphene.UUID())
    all_shooting_modes = graphene.List(graphene.String, library_id=graphene.UUID())

    photo = graphene.Field(PhotoNode, id=graphene.UUID())
    all_photos = DjangoFilterConnectionField(PhotoNode, filterset_class=PhotoFilter, max_limit=None)
    map_photos = DjangoFilterConnectionField(PhotoNode, filterset_class=PhotoFilter)

    all_location_tags = graphene.List(LocationTagType, library_id=graphene.UUID(), multi_filter=graphene.String())
    all_object_tags = graphene.List(ObjectTagType, library_id=graphene.UUID(), multi_filter=graphene.String())
    all_person_tags = graphene.List(PersonTagType, library_id=graphene.UUID(), multi_filter=graphene.String())
    all_color_tags = graphene.List(ColorTagType, library_id=graphene.UUID(), multi_filter=graphene.String())
    all_style_tags = graphene.List(StyleTagType, library_id=graphene.UUID(), multi_filter=graphene.String())
    all_event_tags = graphene.List(EventTagType, library_id=graphene.UUID(), multi_filter=graphene.String())
    all_generic_tags = graphene.List(LocationTagType, library_id=graphene.UUID(), multi_filter=graphene.String())
    library_setting = graphene.Field(LibrarySetting, library_id=graphene.UUID())
    photo_file_metadata = graphene.Field(PhotoMetadataFields, photo_file_id=graphene.UUID())
    album_list = DjangoFilterConnectionField(TagNode, library_id=graphene.UUID(), max_limit=None)
    task_progress = graphene.Field(TaskType)

    @login_required
    def resolve_all_libraries(self, info, **kwargs):
        user = info.context.user
        return Library.objects.filter(users__user=user)

    @login_required
    def resolve_camera(self, info, **kwargs):
        id = kwargs.get('id')
        make = kwargs.get('make')
        model = kwargs.get('model')

        if id is not None:
            return Camera.objects.get(pk=id)

        if make is not None and model is not None:
            return Camera.objects.get(make=make, model=model)

        return None

    @login_required
    def resolve_all_cameras(self, info, **kwargs):
        user = info.context.user
        return Camera.objects.filter(
            library__users__user=user, library__id=kwargs.get('library_id'))

    @login_required
    def resolve_lens(self, info, **kwargs):
        id = kwargs.get('id')
        name = kwargs.get('name')

        if id is not None:
            return Lens.objects.get(pk=id)

        if name is not None:
            return Lens.objects.get(name=name)

        return None

    @login_required
    def resolve_all_lenses(self, info, **kwargs):
        user = info.context.user
        return Lens.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'))

    @login_required
    def resolve_all_apertures(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(aperture__isnull=True).values_list('aperture', flat=True).distinct().order_by('aperture')

    @login_required
    def resolve_all_exposures(self, info, **kwargs):
        user = info.context.user
        photo_list = Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(exposure__isnull=True).values_list('exposure', flat=True).distinct().order_by('exposure')
        return sorted(photo_list, key=sort_photos_exposure)

    @login_required
    def resolve_all_iso_speeds(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(iso_speed__isnull=True).values_list('iso_speed', flat=True).distinct().order_by('iso_speed')

    @login_required
    def resolve_all_focal_lengths(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(focal_length__isnull=True).values_list('focal_length', flat=True).distinct().order_by('focal_length')

    @login_required
    def resolve_all_metering_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(metering_mode__isnull=True).values_list('metering_mode', flat=True).distinct().order_by('metering_mode')

    @login_required
    def resolve_all_drive_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(drive_mode__isnull=True).values_list('drive_mode', flat=True).distinct().order_by('drive_mode')

    @login_required
    def resolve_all_shooting_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(shooting_mode__isnull=True).values_list('shooting_mode', flat=True).distinct().order_by('shooting_mode')

    @login_required
    def resolve_photo(self, info, **kwargs):
        id = kwargs.get('id')
        if id is not None:
            return Photo.objects.get(pk=id)
        return None

    @login_required
    def resolve_all_photos(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, thumbnailed_version__isnull=False, deleted=False)

    @login_required
    def resolve_map_photos(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, deleted=False).exclude(latitude__isnull=True, longitude__isnull=True)

    @login_required
    def resolve_all_location_tags(self, info, **kwargs):
        user = info.context.user
        if kwargs.get('multi_filter'):
            if not kwargs.get('library_id'):
                raise GraphQLError('library_id not supplied!')
            filters = kwargs.get('multi_filter').split(' ')
            photos_list = filter_photos_queryset(
                filters, Photo.objects.filter(library__users__user=user),
                kwargs.get('library_id'))
            return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='L', photo_tags__photo__in=photos_list).distinct()
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='L')

    @login_required
    def resolve_all_object_tags(self, info, **kwargs):
        user = info.context.user
        if kwargs.get('multi_filter'):
            if not kwargs.get('library_id'):
                raise GraphQLError('library_id not supplied!')
            filters = kwargs.get('multi_filter').split(' ')
            photos_list = filter_photos_queryset(
                filters, Photo.objects.filter(library__users__user=user),
                kwargs.get('library_id'))
            return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='O', photo_tags__photo__in=photos_list).distinct()
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='O')

    @login_required
    def resolve_all_person_tags(self, info, **kwargs):
        user = info.context.user
        if kwargs.get('multi_filter'):
            if not kwargs.get('library_id'):
                raise GraphQLError('library_id not supplied!')
            filters = kwargs.get('multi_filter').split(' ')
            photos_list = filter_photos_queryset(
                filters, Photo.objects.filter(library__users__user=user),
                kwargs.get('library_id'))
            # Sort Person tags but keep "Unknown..." ones at the end
            return Tag.objects.filter(
                library__users__user=user,
                library__id=kwargs.get('library_id'),
                type='F',
                photo_tags__photo__in=photos_list
            ).annotate(
                unknown_tag=Case(
                    When(name__startswith='Unknown', then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            ).order_by("-unknown_tag", Lower('name')).distinct()
        # Sort Person tags but keep "Unknown..." ones at the end
        return Tag.objects.filter(
            library__users__user=user,
            library__id=kwargs.get('library_id'),
            type='F',
            photo_tags__deleted=False
        ).annotate(
            unknown_tag=Case(
                When(name__startswith='Unknown', then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            )
        ).order_by("-unknown_tag", Lower('name')).distinct()

    @login_required
    def resolve_all_color_tags(self, info, **kwargs):
        user = info.context.user
        if kwargs.get('multi_filter'):
            if not kwargs.get('library_id'):
                raise GraphQLError('library_id not supplied!')
            filters = kwargs.get('multi_filter').split(' ')
            photos_list = filter_photos_queryset(
                filters, Photo.objects.filter(library__users__user=user),
                kwargs.get('library_id'))
            return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='C', photo_tags__photo__in=photos_list).distinct()
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='C')

    @login_required
    def resolve_all_style_tags(self, info, **kwargs):
        user = info.context.user
        if kwargs.get('multi_filter'):
            if not kwargs.get('library_id'):
                raise GraphQLError('library_id not supplied!')
            filters = kwargs.get('multi_filter').split(' ')
            photos_list = filter_photos_queryset(
                filters, Photo.objects.filter(library__users__user=user),
                kwargs.get('library_id'))
            return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='S', photo_tags__photo__in=photos_list).distinct()
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='S')

    @login_required
    def resolve_all_event_tags(self, info, **kwargs):
        user = info.context.user
        if kwargs.get('multi_filter'):
            if not kwargs.get('library_id'):
                raise GraphQLError('library_id not supplied!')
            filters = kwargs.get('multi_filter').split(' ')
            photos_list = filter_photos_queryset(
                filters, Photo.objects.filter(library__users__user=user),
                kwargs.get('library_id'))
            return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='E', photo_tags__photo__in=photos_list).distinct()
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='E')

    @login_required
    def resolve_all_generic_tags(self, info, **kwargs):
        user = info.context.user
        if kwargs.get('multi_filter'):
            if not kwargs.get('library_id'):
                raise GraphQLError('library_id not supplied!')
            filters = kwargs.get('multi_filter').split(' ')
            photos_list = filter_photos_queryset(
                filters, Photo.objects.filter(library__users__user=user),
                kwargs.get('library_id'))
            return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='G', photo_tags__photo__in=photos_list).distinct()
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='G')

    @login_required
    def resolve_library_setting(self, info, **kwargs):
        """Api for library setting query."""
        # always pass a dictionary for `library_setting`
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True, id=kwargs.get('library_id'))
        if libraries:
            library_obj = libraries[0]
            library_path = library_obj.paths.all()[0]
            return {"library": library_obj, "source_folder": library_path.path}
        raise Exception('User is not the owner of library!')

    @login_required
    def resolve_photo_file_metadata(self, info, **kwargs):
        """Return metadata for photofile."""
        photo_file = PhotoFile.objects.filter(id=kwargs.get('photo_file_id'))
        if photo_file and os.path.exists(photo_file[0].path):
            metadata = PhotoMetadata(photo_file[0].path)
            return {
                'data': metadata.get_all(),
                'ok': True
            }
        return {'ok': False}

    @login_required
    def resolve_album_list(self, info, **kwargs):
        """Show albums list."""
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='A').distinct()

    @login_required
    def resolve_task_progress(self, info, **kwargs):
        """Return No. of remaining and total tasks with there diffrent types."""
        return {
            "generate_thumbnails": count_remaining_task('generate_thumbnails'),
            "process_raw": count_remaining_task('process_raw'),
            "classify_color": count_remaining_task('classify.color'),
            "classify_location": count_remaining_task('classify.location'),
            "classify_object": count_remaining_task('classify.object'),
            "classify_style": count_remaining_task('classify.style'),
            "classify_face": count_remaining_task('classify.face')}


class LibraryInput(graphene.InputObjectType):
    """LibraryInput to take input of library fields from frontend."""

    classification_color_enabled = graphene.Boolean()
    classification_location_enabled = graphene.Boolean()
    classification_style_enabled = graphene.Boolean()
    classification_object_enabled = graphene.Boolean()
    classification_face_enabled = graphene.Boolean()
    source_folder = graphene.String(required=False)
    user_id = graphene.ID()
    library_id = graphene.ID()


class UpdateLibraryColorEnabled(graphene.Mutation):
    """To update data in database that will be passed from frontend ColorEnabled api."""

    class Arguments:
        """To set arguments in for mute method."""

        input = LibraryInput(required=False)

    ok = graphene.Boolean()
    classification_color_enabled = graphene.Boolean()

    @staticmethod
    def mutate(root, info, input=None):
        """Method to save the updated data for ColorEnabled api."""
        ok = False
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True, id=input.library_id)
        if libraries and str(input.get('classification_color_enabled')) != 'None':
            library_obj = libraries[0]
            library_obj.classification_color_enabled = input.classification_color_enabled
            library_obj.save()
            ok = True
            return UpdateLibraryColorEnabled(
                ok=ok,
                classification_color_enabled=library_obj.classification_color_enabled)
        if not libraries:
            raise Exception('User is not the owner of library!')
        else:
            return UpdateLibraryColorEnabled(ok=ok, classification_color_enabled=None)


class UpdateLibraryLocationEnabled(graphene.Mutation):
    """To update data in database that will be passed from frontend LocationEnabled api."""

    class Arguments:
        """To set arguments in for mute method."""

        input = LibraryInput(required=False)

    ok = graphene.Boolean()
    classification_location_enabled = graphene.Boolean()

    @staticmethod
    def mutate(root, info, input=None):
        """Method to save the updated data for LocationEnabled api."""
        ok = False
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True, id=input.library_id)
        if libraries and str(input.get('classification_location_enabled')) != 'None':
            library_obj = libraries[0]
            library_obj.classification_location_enabled = input.classification_location_enabled
            library_obj.save()
            ok = True
            return UpdateLibraryLocationEnabled(
                ok=ok,
                classification_location_enabled=library_obj.classification_location_enabled)
        if not libraries:
            raise Exception('User is not the owner of library!')
        else:
            return UpdateLibraryLocationEnabled(ok=ok, classification_location_enabled=None)


class UpdateLibraryStyleEnabled(graphene.Mutation):
    """To update data in database that will be passed from frontend StyleEnabled api."""

    class Arguments:
        """To set arguments in for mute method."""

        input = LibraryInput(required=False)

    ok = graphene.Boolean()
    classification_style_enabled = graphene.Boolean()

    @staticmethod
    def mutate(root, info, input=None):
        """Method to save the updated data for StyleEnabled api."""
        ok = False
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True, id=input.library_id)
        if libraries and str(input.get('classification_style_enabled')) != 'None':
            library_obj = libraries[0]
            library_obj.classification_style_enabled = input.classification_style_enabled
            library_obj.save()
            ok = True
            return UpdateLibraryStyleEnabled(
                ok=ok,
                classification_style_enabled=library_obj.classification_style_enabled)
        if not libraries:
            raise Exception('User is not the owner of library!')
        else:
            return UpdateLibraryStyleEnabled(ok=ok, classification_style_enabled=None)


class UpdateLibraryObjectEnabled(graphene.Mutation):
    """To update data in database that will be passed from frontend ObjectEnabled api."""

    class Arguments:
        """To set arguments in for mute method."""

        input = LibraryInput(required=False)

    ok = graphene.Boolean()
    classification_object_enabled = graphene.Boolean()

    @staticmethod
    def mutate(root, info, input=None):
        """Method to save the updated data for ObjectEnabled api."""
        ok = False
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True, id=input.library_id)
        if libraries and str(input.get('classification_object_enabled')) != 'None':
            library_obj = libraries[0]
            library_obj.classification_object_enabled = input.classification_object_enabled
            library_obj.save()
            ok = True
            return UpdateLibraryObjectEnabled(
                ok=ok,
                classification_object_enabled=library_obj.classification_object_enabled)
        if not libraries:
            raise Exception('User is not the owner of library!')
        else:
            return UpdateLibraryObjectEnabled(ok=ok, classification_object_enabled=None)


class UpdateLibraryFaceEnabled(graphene.Mutation):
    """To update data in database that will be passed from frontend FaceEnabled api."""

    class Arguments:
        """To set arguments in for mute method."""

        input = LibraryInput(required=False)

    ok = graphene.Boolean()
    classification_face_enabled = graphene.Boolean()

    @staticmethod
    def mutate(root, info, input=None):
        """Method to save the updated data for FaceEnabled api."""
        ok = False
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True, id=input.library_id)
        if libraries and str(input.get('classification_face_enabled')) != 'None':
            library_obj = libraries[0]
            library_obj.classification_face_enabled = input.classification_face_enabled
            library_obj.save()
            ok = True
            return UpdateLibraryFaceEnabled(
                ok=ok,
                classification_face_enabled=library_obj.classification_face_enabled)
        if not libraries:
            raise Exception('User is not the owner of library!')
        else:
            return UpdateLibraryFaceEnabled(ok=ok, classification_face_enabled=None)


class UpdateLibrarySourceFolder(graphene.Mutation):
    """To update data in database that will be passed from frontend SourceFolder api."""

    class Arguments:
        """To set arguments in for mute method."""

        input = LibraryInput(required=False)

    ok = graphene.Boolean()
    source_folder = graphene.String()

    @staticmethod
    def mutate(root, info, input=None):
        """Method to save the updated data for SourceFolder api."""
        ok = False
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True, id=input.library_id)
        if libraries and input.get('source_folder'):
            library_path = libraries[0].paths.all()[0]
            library_path.path = input.source_folder
            library_path.save()
            return UpdateLibrarySourceFolder(
                ok=ok,
                source_folder=library_path.path)
        if not libraries:
            raise Exception('User is not the owner of library!')
        else:
            return UpdateLibrarySourceFolder(ok=ok, source_folder=None)


class CreateLibraryInput(graphene.InputObjectType):
    """CreateLibraryInput to take input of create library form fields from frontend."""

    name = graphene.String(required=True)
    backend_type = graphene.String(required=True)
    path = graphene.String(required=True)
    url = graphene.String(required=False)
    s3_access_key_id = graphene.String(required=False)
    s3_secret_key = graphene.String(required=False)
    user_id = graphene.ID(required=True)


class CreateLibrary(graphene.Mutation):
    """Docstring for CreateLibrary."""

    class Arguments:
        """Docstring for Arguments."""

        input = CreateLibraryInput()

    has_created_library = graphene.Boolean()
    ok = graphene.Boolean()
    user_id = graphene.ID()
    library_id = graphene.ID()
    library_path_id = graphene.ID()

    @staticmethod
    def mutate(self, info, input=None):
        """Mutate method."""
        library_obj = Library.objects.create(name=input.name)
        if input.backend_type == 'Lo':
            library_path_obj = LibraryPath.objects.create(
                library=library_obj, type="St",
                backend_type=input.backend_type, path=input.path)
        else:
            library_path_obj = LibraryPath.objects.create(
                library=library_obj, backend_type="S3",
                type="St", path=input.path, url=input.get('url'),
                s3_access_key_id=input.s3_access_key_id,
                s3_secret_key=input.s3_secret_key)
        user = User.objects.get(pk=input.user_id)
        user.has_created_library = True
        user.save()
        LibraryUser.objects.create(
            library=library_obj, user=user, owner=True)
        return CreateLibrary(
            has_created_library=user.has_created_library, ok=True,
            user_id=user.id, library_id=library_obj.id,
            library_path_id=library_path_obj.id)


class PhotoImportingInput(graphene.InputObjectType):
    """PhotoImportingInput to take input of PhotoImporting fields from frontend."""

    watch_for_changes = graphene.Boolean(required=True)
    add_another_path = graphene.Boolean(required=True)
    import_path = graphene.String(required=False)
    delete_after_import = graphene.Boolean(required=False)
    user_id = graphene.ID(required=True)
    library_id = graphene.ID(required=True)
    library_path_id = graphene.ID(required=True)


class PhotoImporting(graphene.Mutation):
    """Docstring for PhotoImporting."""

    class Arguments:
        """Docstring for Arguments."""

        input = PhotoImportingInput()

    has_configured_importing = graphene.Boolean()
    ok = graphene.Boolean()
    user_id = graphene.ID()
    library_id = graphene.ID()

    @staticmethod
    def mutate(self, info, input=None):
        """Mutate method."""
        library_path_obj = LibraryPath.objects.get(pk=input.library_path_id)
        library_path_obj.watch_for_changes = input.watch_for_changes
        library_path_obj.save()
        if input.add_another_path:
            LibraryPath.objects.create(
                library=Library.objects.get(pk=input.library_id),
                type="Im", backend_type="Lo",
                path=input.import_path, delete_after_import=input.delete_after_import)
        user = User.objects.get(pk=input.user_id)
        user.has_configured_importing = True
        user.save()
        return PhotoImporting(
            has_configured_importing=user.has_configured_importing,
            ok=True, user_id=user.id, library_id=input.library_id)


class ImageAnalysis(graphene.Mutation):
    """Docstring for ImageAnalysis."""

    class Arguments:
        """Docstring for Arguments."""

        input = LibraryInput()

    has_configured_image_analysis = graphene.Boolean()
    ok = graphene.Boolean()
    user_id = graphene.ID()

    @staticmethod
    def mutate(self, info, input=None):
        """Mutate method."""
        library_obj = Library.objects.get(pk=input.library_id)
        library_obj.classification_color_enabled = input.classification_color_enabled
        library_obj.classification_location_enabled = input.classification_location_enabled
        library_obj.classification_style_enabled = input.classification_style_enabled
        library_obj.classification_object_enabled = input.classification_object_enabled
        library_obj.classification_face_enabled = input.classification_face_enabled
        library_obj.save()
        user = User.objects.get(pk=input.user_id)
        user.has_configured_image_analysis = True
        user.save()
        # For make user login automatically from backend.
        if not hasattr(user, 'backend'):
            for backend in settings.AUTHENTICATION_BACKENDS:
                if user == load_backend(backend).get_user(user.pk):
                    user.backend = backend
                    break
        if hasattr(user, 'backend'):
            login(info.context, user)
        # Finish user login
        return ImageAnalysis(
            has_configured_image_analysis=user.has_configured_image_analysis,
            ok=True, user_id=input.user_id)


class PhotoRating(graphene.Mutation):
    """Mutation to save star rating for photo."""

    class Arguments:
        photo_id = graphene.ID()
        star_rating = graphene.Int()

    ok = graphene.Boolean()
    photo = graphene.Field(PhotoNode)

    @staticmethod
    def mutate(self, info, photo_id=None, star_rating=None):
        try:
            if 0 <= star_rating <= 5:
                photo_obj = Photo.objects.get(pk=photo_id)
                photo_obj.star_rating = star_rating
                photo_obj.save()
                return PhotoRating(ok=True, photo=photo_obj)
        except:
            raise GraphQLError("rating is required!")
        return PhotoRating(ok=False, photo=None)


class CreateGenricTag(graphene.Mutation):
    class Arguments:
        name = graphene.String()
        photo_id = graphene.ID()

    ok = graphene.Boolean()
    tag_id = graphene.ID()
    photo_tag_id = graphene.ID()
    name = graphene.String()

    @staticmethod
    def mutate(self, info, name=None, photo_id=None):
        try:
            photo_obj = Photo.objects.get(id=photo_id)
        except Exception as e:
            raise GraphQLError("Invalid photo id!")
        tag_obj, created = Tag.objects.get_or_create(
            library=photo_obj.library,
            name=name, type='G', source='H', defaults={})
        if (not created) and photo_obj.photo_tags.filter(tag=tag_obj).exists():
            return CreateGenricTag(
                ok=False, tag_id=None,
                photo_tag_id=None, name=None)
        photo_tag_obj = PhotoTag.objects.create(
            photo=photo_obj,
            tag=tag_obj,
            confidence=1.0,
            significance=1.0,
            verified=True,
            source='H',
        )
        return CreateGenricTag(
            ok=True, tag_id=tag_obj.id,
            photo_tag_id=photo_tag_obj.id, name=tag_obj.name)


class RemoveGenericTag(graphene.Mutation):
    class Arguments:
        photo_id = graphene.ID()
        tag_id = graphene.ID()

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, photo_id=None, tag_id=None):
        Photo.objects.get(id=photo_id).photo_tags.remove(PhotoTag.objects.get(photo_id=photo_id, tag__id=tag_id))
        if Photo.objects.filter(photo_tags__tag__id=tag_id).count() == 0:
            Tag.objects.get(id=tag_id).delete()
        return RemoveGenericTag(ok=True)


class ChangePreferredPhotoFile(graphene.Mutation):
    """To update preferred_photo_file with selected photofile version on frontend."""

    class Arguments:
        """Input arguments which will pass from frontend."""

        selected_photo_file_id = graphene.ID()

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, selected_photo_file_id=None):
        """Mutation to update preferred_photo_file for photo."""
        photo_obj = PhotoFile.objects.get(id=selected_photo_file_id).photo
        photo_obj.preferred_photo_file = PhotoFile.objects.get(id=selected_photo_file_id)
        photo_obj.save()
        Task(type='generate_thumbnails', subject_id=photo_obj.id, library=photo_obj.library).save()
        return ChangePreferredPhotoFile(ok=True)


class EditFaceTag(graphene.Mutation):
    """Face tagging for face Detection."""

    class Arguments:
        """Input arguments which will pass from frontend."""
        photo_tag_id = graphene.ID()
        new_name = graphene.String()

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, photo_tag_id=None, new_name=None):
        """Mutation to create or update face tags and assign them to photoTag."""
        obj = Tag.objects.filter(name=new_name, type='F').first()
        photo_tag = PhotoTag.objects.get(id=photo_tag_id)
        already_assigned_tag = photo_tag.tag
        if obj:
            photo_tag.tag = obj
            photo_tag.save()
            already_assigned_tag.photo_tags.all().count() or already_assigned_tag.delete()
        else:
            already_assigned_tag.name = new_name
            already_assigned_tag.save()
        photo_tag.verified = True
        photo_tag.confidence = 1
        photo_tag.deleted = False
        photo_tag.save()
        return EditFaceTag(ok=True)


class BlockFaceTag(graphene.Mutation):
    """Face tagging for face Detection."""

    class Arguments:
        """Input arguments which will pass from frontend."""

        photo_tag_id = graphene.ID()

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, photo_tag_id=None, new_name=None):
        """Mutation to block a face 'F' type photoTag."""
        photo_tag = PhotoTag.objects.get(id=photo_tag_id)
        photo_tag.deleted = True
        photo_tag.verified = False
        photo_tag.confidence = 0
        photo_tag.save()
        return BlockFaceTag(ok=True)


class VerifyPhoto(graphene.Mutation):
    """Face tagging for face Detection."""

    class Arguments:
        """Input arguments which will pass from frontend."""

        photo_tag_id = graphene.ID()

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, photo_tag_id=None, new_name=None):
        """Mutation to set verify a face 'F' type photoTag."""
        photo_tag = PhotoTag.objects.get(id=photo_tag_id)
        photo_tag.verified = True
        photo_tag.confidence = 1
        photo_tag.save()
        return VerifyPhoto(ok=True)


class AssignTagToPhotos(graphene.Mutation):
    """Create and assign tag to the list of photos."""
    class Arguments:
        name = graphene.String()
        photo_ids = graphene.String()
        tag_type= graphene.String()

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, name, photo_ids, tag_type):
        try:
            photo_list = Photo.objects.filter(id__in=photo_ids.split(',')) 
            tag_obj, created = Tag.objects.get_or_create(
                library=photo_list[0].library,
                name=name, type=tag_type, source='H', defaults={})            
            for photo in photo_list:
                if not photo.photo_tags.filter(tag=tag_obj).exists():
                    photo_tag_obj = PhotoTag.objects.create(
                        photo=photo,
                        tag=tag_obj,
                        confidence=1.0,
                        significance=1.0,
                        verified=True,
                        source='H',
                    )
            return AssignTagToPhotos(ok=True)
        except Exception as e:
            raise GraphQLError("Something Went wrong!")


class SetPhotosDeleted(graphene.Mutation):
    """Set delete field true for a photo objects."""

    class Arguments:
        """Input arguments which will pass from frontend."""

        photo_ids = graphene.String()

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, photo_ids):
        """Mutation to set delete field true for a photo objects."""
        try:
            photo_list = Photo.objects.filter(id__in=photo_ids.split(','))       
            for photo in photo_list:
                photo.deleted = True
                photo.save() 
            return SetPhotosDeleted(ok=True)
        except Exception as e:
            raise GraphQLError("Something Went wrong!")


class RemovePhotosFromAlbum(graphene.Mutation):
    """Remove photos from particular album tag."""

    class Arguments:
        """Input arguments which will pass from frontend."""

        photo_ids = graphene.String()
        album_id  = graphene.String()

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, photo_ids, album_id):
        """Mutation remove photos from particular album tag."""
        try:
            for photo_id in photo_ids.split(','):
                photo_tag = PhotoTag.objects.get(photo__id=photo_id,tag__id=album_id)
                photo_tag.delete()
            return RemovePhotosFromAlbum(ok=True)
        except Exception as e:
            raise GraphQLError("Something Went wrong!")


class SavePhotoFileRotation(graphene.Mutation):
    """To save photoFile rotation."""

    class Arguments:
        """Input arguments which will pass from frontend."""
        photo_file_id = graphene.ID()
        rotation = graphene.Int()

    ok = graphene.Boolean()
    rotation = graphene.Int()

    @staticmethod
    def mutate(self, info, photo_file_id=None, rotation=None):
        """Mutation to save photoFile rotation."""
        if photo_file_id and rotation in [0, 90, 180, 270]:
            photofile_obj = PhotoFile.objects.get(id=photo_file_id)
            photofile_obj.rotation = rotation
            photofile_obj.save()
            Task(
                type='generate_thumbnails', subject_id=photofile_obj.photo.id,
                library=photofile_obj.photo.library).save()
            return SavePhotoFileRotation(ok=True, rotation=rotation)
        return SavePhotoFileRotation(ok=False, rotation=rotation)


class Mutation(graphene.ObjectType):
    update_color_enabled = UpdateLibraryColorEnabled.Field()
    update_location_enabled = UpdateLibraryLocationEnabled.Field()
    update_style_enabled = UpdateLibraryStyleEnabled.Field()
    update_object_enabled = UpdateLibraryObjectEnabled.Field()
    update_face_enabled = UpdateLibraryFaceEnabled.Field()
    update_source_folder = UpdateLibrarySourceFolder.Field()
    create_library = CreateLibrary.Field()
    Photo_importing = PhotoImporting.Field()
    image_analysis = ImageAnalysis.Field()
    photo_rating = PhotoRating.Field()
    create_generic_tag = CreateGenricTag.Field()
    remove_generic_tag = RemoveGenericTag.Field()
    change_preferred_photo_file = ChangePreferredPhotoFile.Field()
    edit_face_tag = EditFaceTag.Field()
    block_face_tag = BlockFaceTag.Field()
    verify_photo = VerifyPhoto.Field()
    assign_tag_to_photos = AssignTagToPhotos.Field()
    set_photos_deleted = SetPhotosDeleted.Field()
    remove_photos_from_album = RemovePhotosFromAlbum.Field()
    save_photoFile_rotation = SavePhotoFileRotation.Field()
