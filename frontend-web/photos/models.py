from __future__ import unicode_literals

from django.contrib.gis.db.models import PointField
from django.db import models

from common.models import UUIDModel, VersionedModel
from world.models import WorldBorder, City
from world.utils import country_from_point_field


class Camera(UUIDModel, VersionedModel):
    make            = models.CharField(max_length=128)
    model           = models.CharField(max_length=128)
    earliest_photo  = models.DateTimeField()
    latest_photo    = models.DateTimeField()

    def __str__(self):
        return '{} {}'.format(self.make, self.model)


class Lens(UUIDModel, VersionedModel):
    name            = models.CharField(max_length=128)
    earliest_photo  = models.DateTimeField()
    latest_photo    = models.DateTimeField()

    class Meta:
        verbose_name_plural = 'lenses'

    def __str__(self):
        return self.name


class Photo(UUIDModel, VersionedModel):
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
    camera                              = models.ForeignKey(Camera, related_name='photos', null=True)
    lens                                = models.ForeignKey(Lens, related_name='photos', null=True)
    location                            = PointField(null=True)
    altitude                            = models.DecimalField(max_digits=6, decimal_places=1, null=True)
    last_auto_tagged_locations_version  = models.PositiveSmallIntegerField(null=True)
    last_auto_tagged_locations_at       = models.DateTimeField(null=True)
    last_auto_tagged_features_version   = models.PositiveSmallIntegerField(null=True)
    last_auto_tagged_features_at        = models.DateTimeField(null=True)
    last_auto_tagged_people_version     = models.PositiveSmallIntegerField(null=True)
    last_auto_tagged_people_at          = models.DateTimeField(null=True)

    def __str__(self):
        return str(self.id)

    @property
    def country(self):
        return country_from_point_field(self.location)

    @property
    def thumbnail_url(self):
        return '/thumbnails/{}.jpg'.format(self.id)


class PhotoFile(UUIDModel, VersionedModel):
    photo               = models.ForeignKey(Photo, related_name='files')
    path                = models.CharField(max_length=512)
    width               = models.PositiveSmallIntegerField()
    height              = models.PositiveSmallIntegerField()
    mimetype            = models.CharField(max_length=32, blank=True)
    file_modified_at    = models.DateTimeField()
    bytes               = models.PositiveIntegerField()
    preferred           = models.BooleanField(default=False)

    def __str__(self):
        return str(self.path)


SOURCE_CHOICES = (
    ('H', 'Human'),
    ('C', 'Computer'),
)
TAG_TYPE_CHOICES = (
    ('L', 'Location'),
    ('F', 'Feature'),
    ('P', 'Person'),
)


class Face(UUIDModel, VersionedModel):
    photo       = models.ForeignKey(Photo, related_name='faces')
    position_x  = models.FloatField()
    position_y  = models.FloatField()
    size_x      = models.FloatField()
    size_y      = models.FloatField()
    source      = models.CharField(max_length=1, choices=SOURCE_CHOICES)
    confidence  = models.FloatField()
    verified    = models.BooleanField(default=False)
    hidden      = models.BooleanField(default=False)


class Tag(UUIDModel, VersionedModel):
    name            = models.CharField(max_length=128)
    parent          = models.ForeignKey('Tag', related_name='+', null=True)
    type            = models.CharField(max_length=1, choices=TAG_TYPE_CHOICES, null=True)
    source          = models.CharField(max_length=1, choices=SOURCE_CHOICES)
    # Only if the type is 'Location' and matches a country or city
    world_border    = models.ForeignKey(WorldBorder, related_name='tags', null=True)
    city            = models.ForeignKey(City, related_name='tags', null=True)


class PhotoTag(UUIDModel, VersionedModel):
    photo       = models.ForeignKey(Photo, related_name='photo_tags')
    tag         = models.ForeignKey(Tag, related_name='photo_tags')
    source      = models.CharField(max_length=1, choices=SOURCE_CHOICES)
    confidence  = models.FloatField()
    verified    = models.BooleanField(default=False)
    hidden      = models.BooleanField(default=False)
    # Only if the tag type is 'Person'
    face        = models.ForeignKey(Face, related_name='photo_tags', null=True)
