from __future__ import unicode_literals
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.utils import timezone

from photonix.common.models import UUIDModel, VersionedModel
from photonix.web.utils import logger


User = get_user_model()


LIBRARY_SETUP_STAGE_COMPLETED_CHOICES = (
    ('St', 'Storage backend configured'),
    ('Im', 'Photo importing configured'),
    ('Th', 'Thumbnailing storage configured'),
)


class Library(UUIDModel, VersionedModel):
    name = models.CharField(max_length=128, help_text='Display name of the library')
    classification_color_enabled = models.BooleanField(default=False, help_text='Run color analysis on photos?')
    classification_location_enabled = models.BooleanField(default=False, help_text='Run location detection on photos?')
    classification_style_enabled = models.BooleanField(default=False, help_text='Run style classification on photos?')
    classification_object_enabled = models.BooleanField(default=False, help_text='Run object detection on photos?')
    classification_face_enabled = models.BooleanField(default=False, help_text='Run face detection on photos?')
    setup_stage_completed = models.CharField(max_length=2, choices=LIBRARY_SETUP_STAGE_COMPLETED_CHOICES, blank=True, null=True, help_text='Where the user got to during onboarding setup')

    class Meta:
        verbose_name_plural = 'Libraries'

    def __str__(self):
        return self.name

    def rescan(self):
        for library_path in self.paths:
            library_path.rescan()

    def get_library_path_store(self):
        return self.paths.filter(type='St')[0]


LIBRARY_PATH_TYPE_CHOICES = (
    ('St', 'Store'),
    ('Im', 'Import only'),
    ('Th', 'Thumbnails'),
)

LIBRARY_PATH_BACKEND_TYPE_CHOICES = (
    ('Lo', 'Local filesystem'),
    ('S3', 'S3-compatible block storage'),
)


class LibraryPath(UUIDModel, VersionedModel):
    library = models.ForeignKey(Library, related_name='paths', on_delete=models.CASCADE)
    type = models.CharField(max_length=2, choices=LIBRARY_PATH_TYPE_CHOICES, help_text='What type of path this is')
    backend_type = models.CharField(max_length=2, choices=LIBRARY_PATH_BACKEND_TYPE_CHOICES, help_text='What type of storage to use for imported photos')
    path = models.CharField(max_length=128, help_text='Path for storing photos - local path or bucket name')
    url = models.CharField(max_length=128, blank=True, null=True, help_text='If a public-facing URL is available to access block storage, client will use this to download photos')
    delete_after_import = models.BooleanField(default=False, help_text='Remove the photo from import_path after import succeeded?')
    watch_for_changes = models.BooleanField(default=False, help_text='Watch import_path for local filesystem changes?')
    s3_access_key_id = models.CharField(max_length=20, blank=True, null=True, help_text='AWS S3 (or compatible) access key ID')
    s3_secret_key = models.CharField(max_length=40, blank=True, null=True, help_text='AWS S3 (or compatible) secret key')

    def rescan(self):
        from photonix.photos.utils.organise import import_photos_in_place

        if self.type == 'St' and self.backend_type == 'Lo':
            import_photos_in_place(self)


class LibraryUser(UUIDModel, VersionedModel):
    library = models.ForeignKey(Library, related_name='users', on_delete=models.CASCADE)
    user = models.ForeignKey(User, related_name='libraries', on_delete=models.CASCADE)
    owner = models.BooleanField(default=False, help_text='This User is responsible for this Library\'s settings and maintenance')

    class Meta:
        unique_together = [['library', 'user']]

    def __str__(self):
        return f'{self.library.name} ({self.user.username})'


class Camera(UUIDModel, VersionedModel):
    library = models.ForeignKey(Library, related_name='cameras', on_delete=models.CASCADE)
    make = models.CharField(max_length=128)
    model = models.CharField(max_length=128)
    earliest_photo = models.DateTimeField()
    latest_photo = models.DateTimeField()

    class Meta:
        unique_together = [['library', 'make', 'model']]
        ordering = ['make', 'model']

    def __str__(self):
        return '{} {}'.format(self.make, self.model)


class Lens(UUIDModel, VersionedModel):
    library = models.ForeignKey(Library, related_name='lenses', on_delete=models.CASCADE)
    name = models.CharField(max_length=128)
    earliest_photo = models.DateTimeField()
    latest_photo = models.DateTimeField()

    class Meta:
        verbose_name_plural = 'lenses'
        ordering = ['name']

    def __str__(self):
        return self.name


class Photo(UUIDModel, VersionedModel):
    library = models.ForeignKey(Library, related_name='photos', on_delete=models.CASCADE)
    visible = models.BooleanField(default=False)
    taken_at = models.DateTimeField(null=True)
    taken_by = models.CharField(max_length=128, blank=True, null=True)
    aperture = models.DecimalField(max_digits=3, decimal_places=1, null=True)
    exposure = models.CharField(max_length=8, blank=True, null=True)
    iso_speed = models.PositiveIntegerField(null=True)
    focal_length = models.DecimalField(max_digits=4, decimal_places=1, null=True)
    flash = models.BooleanField(null=True)
    metering_mode = models.CharField(max_length=64, null=True)
    drive_mode = models.CharField(max_length=64, null=True)
    shooting_mode = models.CharField(max_length=64, null=True)
    camera = models.ForeignKey(Camera, related_name='photos', null=True, on_delete=models.CASCADE)
    lens = models.ForeignKey(Lens, related_name='photos', null=True, on_delete=models.CASCADE)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    altitude = models.DecimalField(max_digits=6, decimal_places=1, null=True)
    star_rating = models.PositiveIntegerField(
        help_text='assign rating to photo', verbose_name="Rating", null=True, blank=True)
    preferred_photo_file = models.ForeignKey('PhotoFile', related_name='+', null=True, on_delete=models.SET_NULL)  # File selected by the user that is the best version to be used
    thumbnailed_version = models.PositiveIntegerField(default=0)  # Version from photos.utils.thumbnails.THUMBNAILER_VERSION at time of generating the required thumbnails declared in settings.THUMBNAIL_SIZES
    deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['-taken_at']

    def __str__(self):
        return str(self.id)

    # @property
    # def country(self):
    #     return country_from_point_field(self.location)

    def thumbnail_url(self, thumbnail):
        return '/thumbnails/{}x{}_{}_q{}/{}.jpg'.format(thumbnail[0], thumbnail[1], thumbnail[2], thumbnail[3], self.id)

    def thumbnail_path(self, thumbnail):
        return str(Path(settings.THUMBNAIL_ROOT) / 'photofile' / '{}x{}_{}_q{}/{}.jpg'.format(thumbnail[0], thumbnail[1], thumbnail[2], thumbnail[3], self.base_file.id))

    @property
    def base_file(self):
        preferred_files = []
        if self.preferred_photo_file:
            preferred_files = [self.preferred_photo_file]
        if not preferred_files:
            preferred_files = self.files.all().order_by('-file_modified_at')
        if preferred_files:
            return preferred_files[0]
        return None

    @property
    def base_image_path(self):
        return self.base_file.base_image_path

    @property
    def download_url(self):
        library_url = self.library.get_library_path_store().url
        if not library_url:
            library_url = '/photos/'
        library_path = self.library.get_library_path_store().path
        if not library_path:
            library_path = '/data/photos/'
        return self.base_file.path.replace(library_path, library_url)

    @property
    def dimensions(self):
        file = self.base_file
        if file:
            return (file.width, file.height)
        return (None, None)

    @property
    def has_photo_files(self):
        return self.files.all().count() == 0

    def clear_tags(self, source, type):
        self.photo_tags.filter(tag__source=source, tag__type=type).delete()


class PhotoFile(UUIDModel, VersionedModel):
    photo = models.ForeignKey(Photo, related_name='files', on_delete=models.CASCADE)
    path = models.CharField(max_length=512)
    width = models.PositiveIntegerField(null=True)
    height = models.PositiveIntegerField(null=True)
    mimetype = models.CharField(max_length=32, blank=True, null=True)
    file_modified_at = models.DateTimeField()
    bytes = models.PositiveIntegerField()
    thumbnailed_version = models.PositiveIntegerField(default=0)  # Version from photos.utils.thumbnails.THUMBNAILER_VERSION at time of generating the required thumbnails declared in settings.THUMBNAIL_SIZES
    raw_processed = models.BooleanField(default=False)
    raw_version = models.PositiveIntegerField(null=True)
    raw_external_params = models.CharField(max_length=32, blank=True, null=True)
    raw_external_version = models.CharField(max_length=32, blank=True, null=True)
    rotation = models.PositiveIntegerField(null=True, default=0)

    def __str__(self):
        return str(self.path)

    @property
    def url(self):
        return self.path.split('/data', 1)[1]

    @property
    def base_image_path(self):
        from photonix.photos.utils.raw import NON_RAW_MIMETYPES

        if self.mimetype not in NON_RAW_MIMETYPES:
            return str(Path(settings.PHOTO_RAW_PROCESSED_DIR) / str('{}.jpg'.format(self.id)))
        return self.path


SOURCE_CHOICES = (
    ('C', 'Computer'),
    ('H', 'Human'),
)
TAG_TYPE_CHOICES = (
    ('A', 'Album'),  # Assigned to an album by user
    ('C', 'Color'), # Color detected by classifier
    ('E', 'Event'),  # Image creation date matches a festival or type of event
    ('F', 'Face'), # Face detected by classifier
    ('G', 'Generic'),  # Tags assigned by user
    ('L', 'Location'), # Location detected using GPS coordinates by classifier
    ('O', 'Object'), # Object detected by classifier
    ('S', 'Style'),  # See Karayev et al.: Recognizing Image Style
)


class Tag(UUIDModel, VersionedModel):
    library = models.ForeignKey(Library, related_name='tags', on_delete=models.CASCADE)
    name = models.CharField(max_length=128)
    parent = models.ForeignKey('Tag', related_name='+', null=True, on_delete=models.CASCADE)
    type = models.CharField(max_length=1, choices=TAG_TYPE_CHOICES, null=True, db_index=True)
    source = models.CharField(max_length=1, choices=SOURCE_CHOICES, db_index=True)
    ordering = models.FloatField(null=True)

    class Meta:
        ordering = ['ordering', 'name']
        unique_together = [['library', 'name', 'type', 'source']]

    def __str__(self):
        return '{} ({})'.format(self.name, self.type)


class PhotoTag(UUIDModel, VersionedModel):
    photo = models.ForeignKey(Photo, related_name='photo_tags', on_delete=models.CASCADE, null=True)
    tag = models.ForeignKey(Tag, related_name='photo_tags', on_delete=models.CASCADE)
    source = models.CharField(max_length=1, choices=SOURCE_CHOICES, db_index=True)
    model_version = models.PositiveIntegerField(default=0, help_text='Version number of classifier model if source is Computer (YYYYMMDD)')
    retrained_model_version = models.PositiveBigIntegerField(default=0, help_text='If classifier has models that are re-trained locally (e.g. Face) then we want to store this too (YYYYMMDDHHMMSS)')
    confidence = models.FloatField()
    significance = models.FloatField(null=True)
    verified = models.BooleanField(default=False)
    hidden = models.BooleanField(default=False)
    # Optional bounding boxes from object detection or face detection
    position_x = models.FloatField(null=True)
    position_y = models.FloatField(null=True)
    size_x = models.FloatField(null=True)
    size_y = models.FloatField(null=True)
    # A place to store extra JSON data such as face feature positions for eyes, nose and mouth
    extra_data = models.TextField(null=True)
    deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['-significance']

    def __str__(self):
        return '{}: {}'.format(self.photo, self.tag)


TASK_STATUS_CHOICES = (
    ('P', 'Pending'),
    ('S', 'Started'),
    ('C', 'Completed'),
    ('F', 'Failed'),
)


class Task(UUIDModel, VersionedModel):
    type = models.CharField(max_length=128, db_index=True)
    subject_id = models.UUIDField(db_index=True)
    status = models.CharField(max_length=1, choices=TASK_STATUS_CHOICES, default='P', db_index=True)
    started_at = models.DateTimeField(null=True)
    finished_at = models.DateTimeField(null=True)
    parent = models.ForeignKey('self', related_name='children', null=True, on_delete=models.CASCADE)
    complete_with_children = models.BooleanField(default=False)
    library = models.ForeignKey(Library, related_name='task_library', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return '{}: {}'.format(self.type, self.created_at)

    def start(self):
        self.status = 'S'
        self.started_at = timezone.now()
        self.save()

    def complete(self, next_type=None, next_subject_id=None):
        # Set status of current task and queue up next task if appropriate
        self.status = 'C'
        self.finished_at = timezone.now()
        self.save()

        # Create next task in the chain if there should be one
        if not self.parent and next_type:
            Task(type=next_type, subject_id=next_subject_id, library=self.library).save()

        if self.parent and self.parent.complete_with_children:
            # If all siblings are complete, we should mark our parent as complete
            with transaction.atomic():
                # select_for_update() will block if another process is working with these children
                siblings = self.parent.children.select_for_update().filter(status='C')
                if siblings.count() == self.parent.children.count():
                    self.parent.complete(
                        next_type=next_type, next_subject_id=next_subject_id)

    def failed(self, error=None, traceback=None):
        self.status = 'F'
        self.finished_at = timezone.now()
        self.save()

        if error:
            logger.error(error)
