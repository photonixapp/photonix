from __future__ import unicode_literals
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.utils import timezone

from photonix.common.models import UUIDModel, VersionedModel


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
    setup_stage_completed = models.CharField(max_length=2, choices=LIBRARY_SETUP_STAGE_COMPLETED_CHOICES, blank=True, null=True, help_text='Where the user got to during onboarding setup')

    class Meta:
        verbose_name_plural = 'Libraries'

    def __str__(self):
        return self.name

    def rescan(self):
        for library_path in self.paths:
            library_path.rescan()


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
    flash = models.NullBooleanField()
    metering_mode = models.CharField(max_length=32, null=True)
    drive_mode = models.CharField(max_length=32, null=True)
    shooting_mode = models.CharField(max_length=32, null=True)
    camera = models.ForeignKey(Camera, related_name='photos', null=True, on_delete=models.CASCADE)
    lens = models.ForeignKey(Lens, related_name='photos', null=True, on_delete=models.CASCADE)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    altitude = models.DecimalField(max_digits=6, decimal_places=1, null=True)
    star_rating = models.PositiveIntegerField(
        help_text='assign rating to photo', verbose_name="Rating", null=True, blank=True) 

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
        return str(Path(settings.THUMBNAIL_ROOT) / '{}x{}_{}_q{}/{}.jpg'.format(thumbnail[0], thumbnail[1], thumbnail[2], thumbnail[3], self.id))

    @property
    def base_file(self):
        preferred_files = self.files.filter(preferred=True)
        if not preferred_files:
            preferred_files = self.files.filter(raw_processed=True)
        if not preferred_files:
            preferred_files = self.files.filter(
                mimetype='image/jpeg').order_by('-created_at')
        if not preferred_files:
            preferred_files = self.files.all().order_by('-created_at')
        if preferred_files:
            return preferred_files[0]
        return None

    @property
    def base_image_path(self):
        return self.base_file.base_image_path

    @property
    def dimensions(self):
        file = self.base_file
        if file:
            return (file.width, file.height)
        return (None, None)

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
    preferred = models.BooleanField(default=False)
    raw_processed = models.BooleanField(default=False)
    raw_version = models.PositiveIntegerField(null=True)
    raw_external_params = models.CharField(max_length=16, blank=True, null=True)
    raw_external_version = models.CharField(max_length=16, blank=True, null=True)

    def __str__(self):
        return str(self.path)

    @property
    def url(self):
        return self.path.split('/data', 1)[1]

    @property
    def base_image_path(self):
        if self.raw_processed:
            return str(Path(settings.PHOTO_RAW_PROCESSED_DIR) / str('{}.jpg'.format(self.id)))
        return self.path


SOURCE_CHOICES = (
    ('H', 'Human'),
    ('C', 'Computer'),
)
TAG_TYPE_CHOICES = (
    ('L', 'Location'),
    ('O', 'Object'),
    ('F', 'Face'),
    ('C', 'Color'),
    ('S', 'Style'),  # See Karayev et al.: Recognizing Image Style
    ('G', 'Generic'),  # Tags created by user
)


class Tag(UUIDModel, VersionedModel):
    library = models.ForeignKey(Library, related_name='tags', on_delete=models.CASCADE)
    name = models.CharField(max_length=128)
    parent = models.ForeignKey('Tag', related_name='+', null=True, on_delete=models.CASCADE)
    type = models.CharField(max_length=1, choices=TAG_TYPE_CHOICES, null=True)
    source = models.CharField(max_length=1, choices=SOURCE_CHOICES)
    ordering = models.FloatField(null=True)

    class Meta:
        ordering = ['ordering', 'name']
        unique_together = [['library', 'name', 'type', 'source']]

    def __str__(self):
        return '{} ({})'.format(self.name, self.type)


class PhotoTag(UUIDModel, VersionedModel):
    photo = models.ForeignKey(Photo, related_name='photo_tags', on_delete=models.CASCADE, null=True)
    tag = models.ForeignKey(Tag, related_name='photo_tags', on_delete=models.CASCADE)
    source = models.CharField(max_length=1, choices=SOURCE_CHOICES)
    model_version = models.PositiveIntegerField(null=True)
    confidence = models.FloatField()
    significance = models.FloatField(null=True)
    verified = models.BooleanField(default=False)
    hidden = models.BooleanField(default=False)
    # Optional bounding boxes from object detection or face detection
    position_x = models.FloatField(null=True)
    position_y = models.FloatField(null=True)
    size_x = models.FloatField(null=True)
    size_y = models.FloatField(null=True)

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
    status = models.CharField(max_length=1, choices=TAG_TYPE_CHOICES, default='P', db_index=True)
    started_at = models.DateTimeField(null=True)
    finished_at = models.DateTimeField(null=True)
    parent = models.ForeignKey('self', related_name='children', null=True, on_delete=models.CASCADE)
    complete_with_children = models.BooleanField(default=False)

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
            Task(type=next_type, subject_id=next_subject_id).save()

        if self.parent and self.parent.complete_with_children:
            # If all siblings are complete, we should mark our parent as complete
            with transaction.atomic():
                # select_for_update() will block if another process is working with these children
                siblings = self.parent.children.select_for_update().filter(status='C')
                if siblings.count() == self.parent.children.count():
                    self.parent.complete(
                        next_type=next_type, next_subject_id=next_subject_id)

    def failed(self):
        self.status = 'F'
        self.finished_at = timezone.now()
        self.save()
