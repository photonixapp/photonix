from django.conf import settings
import django_filters
from django_filters import CharFilter
import graphene
from graphene_django.filter import DjangoFilterConnectionField
from graphene_django.types import DjangoObjectType
from graphql_jwt.decorators import login_required
from django.contrib.auth import get_user_model
from .models import Library, Camera, Lens, Photo, Tag, PhotoTag, LibraryPath, LibraryUser
from django.contrib.auth import load_backend, login

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
    class Meta:
        model = PhotoTag


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
    location = graphene.String()
    location_tags = graphene.List(PhotoTagType)
    object_tags = graphene.List(PhotoTagType)
    color_tags = graphene.List(PhotoTagType)
    style_tags = graphene.List(PhotoTagType)
    width = graphene.Int()
    height = graphene.Int()

    class Meta:
        model = Photo
        interfaces = (CustomNode, PhotoInterface)

    def resolve_location(self, info):
        if self.latitude and self.longitude:
            return '{},{}'.format(self.latitude, self.longitude)
        return None

    def resolve_url(self, info):
        size = settings.THUMBNAIL_SIZES[-1]
        return self.thumbnail_url(size)

    def resolve_location_tags(self, info):
        return self.photo_tags.filter(tag__type='L')

    def resolve_object_tags(self, info):
        return self.photo_tags.filter(tag__type='O')

    def resolve_color_tags(self, info):
        return self.photo_tags.filter(tag__type='C')

    def resolve_style_tags(self, info):
        return self.photo_tags.filter(tag__type='S')

    def resolve_width(self, info):
        return self.dimensions[0]

    def resolve_height(self, info):
        return self.dimensions[1]


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
        }

    def sanitize(self, value_list):
        return [v for v in value_list if v != '']  # Remove empty items

    def customize(self, value):
        return value

    def multi_filter_filter(self, queryset, name, value):
        filters = value.split(',')
        filters = self.sanitize(filters)
        filters = map(self.customize, filters)

        has_tags = False
        for filter_val in filters:
            if ':' in filter_val:
                key, val = filter_val.split(':')
                if key == 'tag':
                    queryset = queryset.filter(photo_tags__tag__id=val)
                    has_tags = True
                elif key == 'camera':
                    queryset = queryset.filter(camera__id=val)
                elif key == 'lens':
                    queryset = queryset.filter(lens__id=val)
                elif key == 'aperture':
                    queryset = queryset.filter(aperture=val)
                elif key == 'exposure':
                    queryset = queryset.filter(exposure=val)
                elif key == 'isoSpeed':
                    queryset = queryset.filter(iso_speed=val)
                elif key == 'focalLength':
                    queryset = queryset.filter(focal_length=val)
                elif key == 'flash':
                    queryset = queryset.filter(
                        flash=val == 'on' and True or False)
                elif key == 'meeteringMode':
                    queryset = queryset.filter(metering_mode=val)
                elif key == 'driveMode':
                    queryset = queryset.filter(drive_mode=val)
                elif key == 'shootingMode':
                    queryset = queryset.filter(shooting_mode=val)
        if has_tags:
            queryset.order_by('-photo_tags__significance')
        return queryset.distinct()


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


class LibrarySetting(graphene.ObjectType):
    """To pass fields for library settingg query api."""

    library = graphene.Field(LibraryType)
    source_folder = graphene.String()

class Query(graphene.ObjectType):
    all_libraries = graphene.List(LibraryType)
    camera = graphene.Field(CameraType, id=graphene.UUID(), make=graphene.String(), model=graphene.String())
    all_cameras = graphene.List(CameraType)

    lens = graphene.Field(LensType, id=graphene.UUID(), name=graphene.String())
    all_lenses = graphene.List(LensType)

    all_apertures = graphene.List(graphene.Float)
    all_exposures = graphene.List(graphene.String)
    all_iso_speeds = graphene.List(graphene.Int)
    all_focal_lengths = graphene.List(graphene.Float)
    all_metering_modes = graphene.List(graphene.String)
    all_drive_modes = graphene.List(graphene.String)
    all_shooting_modes = graphene.List(graphene.String)

    photo = graphene.Field(PhotoNode, id=graphene.UUID())
    all_photos = DjangoFilterConnectionField(PhotoNode, filterset_class=PhotoFilter)

    all_location_tags = graphene.List(LocationTagType)
    all_object_tags = graphene.List(ObjectTagType)
    all_person_tags = graphene.List(PersonTagType)
    all_color_tags = graphene.List(ColorTagType)
    all_style_tags = graphene.List(StyleTagType)
    library_setting = graphene.Field(LibrarySetting)

    def resolve_all_libraries(self, info, **kwargs):
        user = info.context.user
        return Library.objects.filter(users__user=user)

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
        return Camera.objects.filter(library__users__user=user)

    def resolve_lens(self, info, **kwargs):
        id = kwargs.get('id')
        name = kwargs.get('name')

        if id is not None:
            return Lens.objects.get(pk=id)

        if name is not None:
            return Lens.objects.get(name=name)

        return None

    def resolve_all_lenses(self, info, **kwargs):
        user = info.context.user
        return Lens.objects.filter(library__users__user=user)

    def resolve_all_apertures(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user).exclude(aperture__isnull=True).values_list('aperture', flat=True).distinct().order_by('aperture')

    def resolve_all_exposures(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user).exclude(exposure__isnull=True).values_list('exposure', flat=True).distinct().order_by('exposure')

    def resolve_all_iso_speeds(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user).exclude(iso_speed__isnull=True).values_list('iso_speed', flat=True).distinct().order_by('iso_speed')

    def resolve_all_focal_lengths(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user).exclude(focal_length__isnull=True).values_list('focal_length', flat=True).distinct().order_by('focal_length')

    def resolve_all_metering_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user).exclude(metering_mode__isnull=True).values_list('metering_mode', flat=True).distinct().order_by('metering_mode')

    def resolve_all_drive_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user).exclude(drive_mode__isnull=True).values_list('drive_mode', flat=True).distinct().order_by('drive_mode')

    def resolve_all_shooting_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user).exclude(shooting_mode__isnull=True).values_list('shooting_mode', flat=True).distinct().order_by('shooting_mode')

    def resolve_photo(self, info, **kwargs):
        id = kwargs.get('id')
        if id is not None:
            return Photo.objects.get(pk=id)
        return None

    @login_required
    def resolve_all_photos(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user)

    def resolve_all_location_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, type='L')

    def resolve_all_object_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, type='O')

    def resolve_all_person_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, type='P')

    def resolve_all_color_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, type='C')

    def resolve_all_style_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, type='S')

    def resolve_library_setting(self, info, **kwargs):
        """Api for library setting query."""
        # always pass a dictionary for `library_setting`
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True)
        if libraries:
            library_path = libraries[0].paths.all()[0]
            return {"library": libraries[0], "source_folder": library_path.path}
        raise Exception('User is not the owner of library!')


class LibraryInput(graphene.InputObjectType):
    """LibraryInput to take input of library fields from frontend."""

    classification_color_enabled = graphene.Boolean()
    classification_location_enabled = graphene.Boolean()
    classification_style_enabled = graphene.Boolean()
    classification_object_enabled = graphene.Boolean()
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
        libraries = Library.objects.filter(users__user=user, users__owner=True)
        if libraries and str(input.get('classification_color_enabled')) != 'None':
            libraries[0].classification_color_enabled = input.classification_color_enabled
            libraries[0].save()
            ok = True
            return UpdateLibraryColorEnabled(
                ok=ok,
                classification_color_enabled=libraries[0].classification_color_enabled)
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
        libraries = Library.objects.filter(users__user=user, users__owner=True)
        if libraries and str(input.get('classification_location_enabled')) != 'None':
            libraries[0].classification_location_enabled = input.classification_location_enabled
            libraries[0].save()
            ok = True
            return UpdateLibraryLocationEnabled(
                ok=ok,
                classification_location_enabled=libraries[0].classification_location_enabled)
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
        libraries = Library.objects.filter(users__user=user, users__owner=True)
        if libraries and str(input.get('classification_style_enabled')) != 'None':
            libraries[0].classification_style_enabled = input.classification_style_enabled
            libraries[0].save()
            ok = True
            return UpdateLibraryStyleEnabled(
                ok=ok,
                classification_style_enabled=libraries[0].classification_style_enabled)
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
        libraries = Library.objects.filter(users__user=user, users__owner=True)
        if libraries and str(input.get('classification_object_enabled')) != 'None':
            libraries[0].classification_object_enabled = input.classification_object_enabled
            libraries[0].save()
            ok = True
            return UpdateLibraryObjectEnabled(
                ok=ok,
                classification_object_enabled=libraries[0].classification_object_enabled)
        if not libraries:
            raise Exception('User is not the owner of library!')
        else:
            return UpdateLibraryObjectEnabled(ok=ok, classification_object_enabled=None)


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
        libraries = Library.objects.filter(users__user=user, users__owner=True)
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
        user, created = User.objects.update_or_create(pk=input.user_id, defaults={
            "has_created_library": True})
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
        LibraryPath.objects.filter(pk=input.library_path_id).update(
            watch_for_changes=input.watch_for_changes)
        if input.add_another_path:
            LibraryPath.objects.create(
                library=Library.objects.get(pk=input.library_id),
                type="Im", backend_type="Lo",
                path=input.import_path, delete_after_import=input.delete_after_import)
        user, created = User.objects.update_or_create(pk=input.user_id, defaults={
            "has_configured_importing": True})
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
        Library.objects.filter(pk=input.library_id).update(
            classification_color_enabled=input.classification_color_enabled,
            classification_location_enabled=input.classification_location_enabled,
            classification_style_enabled=input.classification_style_enabled,
            classification_object_enabled=input.classification_object_enabled
        )
        user, created = User.objects.update_or_create(pk=input.user_id, defaults={
            "has_configured_image_analysis": True})
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


class Mutation(graphene.ObjectType):
    """Mutaion."""

    update_color_enabled = UpdateLibraryColorEnabled.Field()
    update_location_enabled = UpdateLibraryLocationEnabled.Field()
    update_style_enabled = UpdateLibraryStyleEnabled.Field()
    update_object_enabled = UpdateLibraryObjectEnabled.Field()
    update_source_folder = UpdateLibrarySourceFolder.Field()
    create_library = CreateLibrary.Field()
    Photo_importing = PhotoImporting.Field()
    image_analysis = ImageAnalysis.Field()
