from django.conf import settings
import django_filters
from django_filters import CharFilter
import graphene
from graphene_django.filter import DjangoFilterConnectionField
from graphene_django.types import DjangoObjectType
from graphql_jwt.decorators import login_required
from .models import Library, Camera, Lens, Photo, Tag, PhotoTag


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
        library_path = libraries[0].paths.all()[0]
        return {"library": libraries[0], "source_folder": library_path.path}


class LibraryInput(graphene.InputObjectType):
    """LibraryInput to take input of library fields from frontend."""

    classification_color_enabled = graphene.Boolean()
    classification_location_enabled = graphene.Boolean()
    classification_style_enabled = graphene.Boolean()
    classification_object_enabled = graphene.Boolean()
    source_folder = graphene.String()


class UpdateLibrary(graphene.Mutation):
    """To update data in database that will be passed from frontend."""

    class Arguments:
        """To set arguments in for mute method."""

        input = LibraryInput(required=True)

    ok = graphene.Boolean()
    library = graphene.Field(LibraryType)
    source_folder = graphene.String()

    @staticmethod
    def mutate(root, info, input=None):
        """Method to save the updated data."""
        ok = False
        user = info.context.user
        libraries = Library.objects.filter(users__user=user, users__owner=True)
        if libraries:
            libraries[0].classification_color_enabled = input.classification_color_enabled
            libraries[0].classification_location_enabled = input.classification_location_enabled
            libraries[0].classification_style_enabled = input.classification_style_enabled
            libraries[0].classification_object_enabled = input.classification_object_enabled
            libraries[0].save()
            library_path = libraries[0].paths.all()[0]
            library_path.path = input.source_folder
            library_path.save()
            ok = True
            return UpdateLibrary(
                ok=ok, library=libraries[0], source_folder=library_path.path)
        return UpdateLibrary(ok=ok, library=None)


class Mutation(graphene.ObjectType):
    """Mutaion."""

    update_library = UpdateLibrary.Field()
