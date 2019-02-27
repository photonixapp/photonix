from __future__ import unicode_literals

from django.db import models, transaction
from django.utils import timezone

from common.models import UUIDModel, VersionedModel


class Camera(UUIDModel, VersionedModel):
    make            = models.CharField(max_length=128)
    model           = models.CharField(max_length=128)
    earliest_photo  = models.DateTimeField()
    latest_photo    = models.DateTimeField()

    class Meta:
        ordering = ['make', 'model']

    def __str__(self):
        return '{} {}'.format(self.make, self.model)


class Lens(UUIDModel, VersionedModel):
    name            = models.CharField(max_length=128)
    earliest_photo  = models.DateTimeField()
    latest_photo    = models.DateTimeField()

    class Meta:
        verbose_name_plural = 'lenses'
        ordering = ['name']

    def __str__(self):
        return self.name


class Photo(UUIDModel, VersionedModel):
    visible                             = models.BooleanField(default=False)
    taken_at                            = models.DateTimeField(null=True)
    taken_by                            = models.CharField(max_length=128, blank=True, null=True)
    aperture                            = models.DecimalField(max_digits=3, decimal_places=1, null=True)
    exposure                            = models.CharField(max_length=8, blank=True, null=True)
    iso_speed                           = models.PositiveIntegerField(null=True)
    focal_length                        = models.DecimalField(max_digits=4, decimal_places=1, null=True)
    flash                               = models.NullBooleanField()
    metering_mode                       = models.CharField(max_length=32, null=True)
    drive_mode                          = models.CharField(max_length=32, null=True)
    shooting_mode                       = models.CharField(max_length=32, null=True)
    camera                              = models.ForeignKey(Camera, related_name='photos', null=True, on_delete=models.CASCADE)
    lens                                = models.ForeignKey(Lens, related_name='photos', null=True, on_delete=models.CASCADE)
    latitude                            = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    longitude                           = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    altitude                            = models.DecimalField(max_digits=6, decimal_places=1, null=True)

    class Meta:
        ordering = ['-taken_at']

    def __str__(self):
        return str(self.id)

    # @property
    # def country(self):
    #     return country_from_point_field(self.location)

    def thumbnail_url(self, thumbnail):
        return '/thumbnails/{}x{}_{}_q{}/{}.jpg'.format(thumbnail[0], thumbnail[1], thumbnail[2], thumbnail[3], self.id)

    @property
    def file(self):
        return self.files.filter(mimetype='image/jpeg').order_by('preferred', '-created_at')[0]

    def clear_tags(self, source, type):
        self.photo_tags.filter(tag__source=source, tag__type=type).delete()

class PhotoFile(UUIDModel, VersionedModel):
    photo               = models.ForeignKey(Photo, related_name='files', on_delete=models.CASCADE)
    path                = models.CharField(max_length=512)
    width               = models.PositiveSmallIntegerField()
    height              = models.PositiveSmallIntegerField()
    mimetype            = models.CharField(max_length=32, blank=True)
    file_modified_at    = models.DateTimeField()
    bytes               = models.PositiveIntegerField()
    preferred           = models.BooleanField(default=False)

    def __str__(self):
        return str(self.path)

    @property
    def url(self):
        return self.path.split('/data', 1)[1]


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
)


class Tag(UUIDModel, VersionedModel):
    name            = models.CharField(max_length=128)
    parent          = models.ForeignKey('Tag', related_name='+', null=True, on_delete=models.CASCADE)
    type            = models.CharField(max_length=1, choices=TAG_TYPE_CHOICES, null=True)
    source          = models.CharField(max_length=1, choices=SOURCE_CHOICES)

    class Meta:
        ordering = ['name']
        unique_together = (('name', 'type', 'source'),)

    def __str__(self):
        return '{} ({})'.format(self.name, self.type)


class PhotoTag(UUIDModel, VersionedModel):
    photo           = models.ForeignKey(Photo, related_name='photo_tags', on_delete=models.CASCADE)
    tag             = models.ForeignKey(Tag, related_name='photo_tags', on_delete=models.CASCADE)
    source          = models.CharField(max_length=1, choices=SOURCE_CHOICES)
    model_version   = models.PositiveIntegerField(null=True)
    confidence      = models.FloatField()
    significance    = models.FloatField(null=True)
    verified        = models.BooleanField(default=False)
    hidden          = models.BooleanField(default=False)
    # Optional bounding boxes from object detection or face detection
    position_x      = models.FloatField(null=True)
    position_y      = models.FloatField(null=True)
    size_x          = models.FloatField(null=True)
    size_y          = models.FloatField(null=True)

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
    type                    = models.CharField(max_length=128, db_index=True)
    subject_id              = models.UUIDField(db_index=True)
    status                  = models.CharField(max_length=1, choices=TAG_TYPE_CHOICES, default='P', db_index=True)
    started_at              = models.DateTimeField(null=True)
    finished_at             = models.DateTimeField(null=True)
    parent                  = models.ForeignKey('self', related_name='children', null=True)
    complete_with_children  = models.BooleanField(default=False)

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
        if next_type:
            Task(type=next_type, subject_id=next_subject_id).save()

        if self.parent and self.parent.complete_with_children:
            # If all siblings are complete, we should mark our parent as complete
            with transaction.atomic():
                # select_for_update() will block if another process is working with these children
                siblings = self.parent.children.select_for_update().filter(status='C')
                if siblings.count() == self.parent.children.count():
                    self.parent.status = 'C'
                    self.parent.save()
