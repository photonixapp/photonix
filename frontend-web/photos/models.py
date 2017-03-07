from __future__ import unicode_literals

from django.contrib.gis.db.models import PointField
from django.db import models

from common.models import UUIDModel, VersionedModel


class Camera(UUIDModel, VersionedModel):
    manufacturer    = models.CharField(max_length=128)
    model           = models.CharField(max_length=128)
    earliest_photo  = models.DateTimeField()
    latest_photo    = models.DateTimeField()


class Lens(UUIDModel, VersionedModel):
    manufacturer    = models.CharField(max_length=128)
    model           = models.CharField(max_length=128)
    earliest_photo  = models.DateTimeField()
    latest_photo    = models.DateTimeField()

    class Meta:
        verbose_name_plural = 'lenses'


class Photo(UUIDModel, VersionedModel):
    taken_at            = models.DateTimeField(null=True)
    taken_by            = models.CharField(max_length=128, blank=True)
    aperture            = models.DecimalField(max_digits=3, decimal_places=1, null=True)
    exposure            = models.CharField(max_length=8, blank=True)
    iso_speed           = models.PositiveIntegerField(null=True)
    focal_length        = models.DecimalField(max_digits=4, decimal_places=1, null=True)
    flash               = models.NullBooleanField()
    metering            = models.CharField(max_length=32)
    drive_mode          = models.CharField(max_length=32)
    shooting_mode       = models.CharField(max_length=32)
    camera              = models.ForeignKey(Camera, related_name='photos', null=True)
    lens                = models.ForeignKey(Lens, related_name='photos', null=True)
    location            = PointField()


PHOTO_FILE_TYPE_CHOICES = (
    ('J', 'JPEG'),
    ('R', 'Raw'),
    ('P', 'PNG'),
    ('T', 'TIFF'),
)


class PhotoFile(UUIDModel, VersionedModel):
    photo               = models.ForeignKey(Photo, related_name='files')
    path                = models.CharField(max_length=512)
    width               = models.PositiveSmallIntegerField()
    height              = models.PositiveSmallIntegerField()
    type                = models.CharField(max_length=1, choices=PHOTO_FILE_TYPE_CHOICES)
    file_modified_at    = models.DateTimeField()
    bytes               = models.PositiveIntegerField()
    preferred           = models.BooleanField(default=False)


TAG_SOURCE_CHOICES = (
    ('H', 'Human'),
    ('A', 'AI'),
)
TAG_CATEGORY_CHOICES = (
    ('CO', 'Country'),
    ('RE', 'Region'),
)


class Tag(UUIDModel, VersionedModel):
    name        = models.CharField(max_length=128)
    parent      = models.ForeignKey('Tag', related_name='+', null=True)
    source      = models.CharField(max_length=1, choices=TAG_SOURCE_CHOICES)
    category    = models.CharField(max_length=2, choices=TAG_CATEGORY_CHOICES, null=True)


class PhotoTag(UUIDModel, VersionedModel):
    photo       = models.ForeignKey(Photo, related_name='photo_tags')
    tag         = models.ForeignKey(Tag, related_name='photo_tags')
    source      = models.CharField(max_length=1, choices=TAG_SOURCE_CHOICES)
    confidence  = models.FloatField()
    verified    = models.BooleanField(default=False)
    hidden      = models.BooleanField(default=False)


class Person(UUIDModel, VersionedModel):
    name    = models.CharField(max_length=128)

    class Meta:
        verbose_name_plural = 'people'


class Face(UUIDModel, VersionedModel):
    photo       = models.ForeignKey(Photo, related_name='faces')
    person      = models.ForeignKey(Person, related_name='faces')
    position_x  = models.FloatField()
    position_y  = models.FloatField()
    size_x      = models.FloatField()
    size_y      = models.FloatField()
    source      = models.CharField(max_length=1, choices=TAG_SOURCE_CHOICES)
    confidence  = models.FloatField()
    verified    = models.BooleanField(default=False)
    hidden      = models.BooleanField(default=False)
