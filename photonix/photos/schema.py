
from django.conf import settings
import django_filters
from django_filters import CharFilter
import graphene
from graphene_django.filter import DjangoFilterConnectionField
from graphene_django.types import DjangoObjectType
from graphql_jwt.decorators import login_required
from graphql import GraphQLError
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
    generic_tags = graphene.List(PhotoTagType)

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

    def resolve_generic_tags(self, info):
        return self.photo_tags.filter(tag__type='G')


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
        filters = value.split(' ')
        filters = self.sanitize(filters)
        filters = map(self.customize, filters)
        has_tags = False
        for filter_val in filters:
            if ':' in filter_val:
                key, val = filter_val.split(':')
                if key == 'library_id':
                    queryset = queryset.filter(library__id=val)
                elif key == 'tag':
                    queryset = queryset.filter(photo_tags__tag__id=val)
                    has_tags = True
                elif key == 'camera':
                    queryset = queryset.filter(camera__id=val)
                elif key == 'lens':
                    queryset = queryset.filter(lens__id=val)
                elif key == 'aperture':
                    queryset = queryset.filter(
                        aperture__gte=float(val.split('-')[0]),
                        aperture__lte=float(val.split('-')[1]))
                elif key == 'exposure':
                    queryset = queryset.filter(exposure__in=val.split('-'))
                elif key == 'isoSpeed':
                    queryset = queryset.filter(
                        iso_speed__gte=int(val.split('-')[0]),
                        iso_speed__lte=int(val.split('-')[1]))
                elif key == 'focalLength':
                    queryset = queryset.filter(
                        focal_length__gte=float(val.split('-')[0]),
                        focal_length__lte=float(val.split('-')[1]))
                elif key == 'flash':
                    queryset = queryset.filter(
                        flash=val == 'on' and True or False)
                elif key == 'meeteringMode':
                    queryset = queryset.filter(metering_mode=val)
                elif key == 'driveMode':
                    queryset = queryset.filter(drive_mode=val)
                elif key == 'shootingMode':
                    queryset = queryset.filter(shooting_mode=val)
                elif key == 'rating':
                    queryset = queryset.filter(
                        star_rating__gte=int(val.split('-')[0]),
                        star_rating__lte=int(val.split('-')[1]))
            else:
                queryset = queryset.filter(photo_tags__tag__name__icontains=filter_val)
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
    all_photos = DjangoFilterConnectionField(PhotoNode, filterset_class=PhotoFilter)

    all_location_tags = graphene.List(LocationTagType, library_id=graphene.UUID())
    all_object_tags = graphene.List(ObjectTagType, library_id=graphene.UUID())
    all_person_tags = graphene.List(PersonTagType, library_id=graphene.UUID())
    all_color_tags = graphene.List(ColorTagType, library_id=graphene.UUID())
    all_style_tags = graphene.List(StyleTagType, library_id=graphene.UUID())
    all_generic_tags = graphene.List(LocationTagType, library_id=graphene.UUID())
    library_setting = graphene.Field(LibrarySetting, library_id=graphene.UUID())

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
        return Camera.objects.filter(
            library__users__user=user, library__id=kwargs.get('library_id'))

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
        return Lens.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'))

    def resolve_all_apertures(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(aperture__isnull=True).values_list('aperture', flat=True).distinct().order_by('aperture')

    def resolve_all_exposures(self, info, **kwargs):
        user = info.context.user
        photo_list = Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(exposure__isnull=True).values_list('exposure', flat=True).distinct().order_by('exposure')
        return sorted(photo_list, key=lambda i: float(i.split('/')[0]) / float(i.split('/')[1] if '/' in i else i))

    def resolve_all_iso_speeds(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(iso_speed__isnull=True).values_list('iso_speed', flat=True).distinct().order_by('iso_speed')

    def resolve_all_focal_lengths(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(focal_length__isnull=True).values_list('focal_length', flat=True).distinct().order_by('focal_length')

    def resolve_all_metering_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(metering_mode__isnull=True).values_list('metering_mode', flat=True).distinct().order_by('metering_mode')

    def resolve_all_drive_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(drive_mode__isnull=True).values_list('drive_mode', flat=True).distinct().order_by('drive_mode')

    def resolve_all_shooting_modes(self, info, **kwargs):
        user = info.context.user
        return Photo.objects.filter(library__users__user=user, library__id=kwargs.get('library_id')).exclude(shooting_mode__isnull=True).values_list('shooting_mode', flat=True).distinct().order_by('shooting_mode')

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
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='L')

    def resolve_all_object_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='O')

    def resolve_all_person_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'),  type='P')

    def resolve_all_color_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='C')

    def resolve_all_style_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='S')

    def resolve_all_generic_tags(self, info, **kwargs):
        user = info.context.user
        return Tag.objects.filter(library__users__user=user, library__id=kwargs.get('library_id'), type='G')

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
                photo_obj, created = Photo.objects.update_or_create(pk=photo_id, defaults={
                    "star_rating": star_rating})
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
            library=Library.objects.filter(users__user=info.context.user).order_by('pk').first(),
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


class Mutation(graphene.ObjectType):
    update_color_enabled = UpdateLibraryColorEnabled.Field()
    update_location_enabled = UpdateLibraryLocationEnabled.Field()
    update_style_enabled = UpdateLibraryStyleEnabled.Field()
    update_object_enabled = UpdateLibraryObjectEnabled.Field()
    update_source_folder = UpdateLibrarySourceFolder.Field()
    create_library = CreateLibrary.Field()
    Photo_importing = PhotoImporting.Field()
    image_analysis = ImageAnalysis.Field()
    photo_rating = PhotoRating.Field()
    create_generic_tag = CreateGenricTag.Field()
    remove_generic_tag = RemoveGenericTag.Field()
