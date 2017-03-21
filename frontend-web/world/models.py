from django.contrib.gis.db import models
from django.contrib.gis.db.models import PointField


class WorldBorder(models.Model):
    # Regular Django fields corresponding to the attributes in the
    # world borders shapefile.
    name        = models.CharField(max_length=50)
    area        = models.IntegerField()
    population  = models.IntegerField('Population')
    fips        = models.CharField('FIPS Code', max_length=2)
    iso2        = models.CharField('2 Digit ISO', max_length=2)
    iso3        = models.CharField('3 Digit ISO', max_length=3)
    un          = models.IntegerField('United Nations Code')
    region      = models.IntegerField('Region Code')
    subregion   = models.IntegerField('Sub-Region Code')
    lat         = models.FloatField()
    lon         = models.FloatField()

    # GeoDjango-specific: a geometry field (MultiPolygonField)
    mpoly = models.MultiPolygonField()

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class City(models.Model):
    name        = models.CharField(max_length=128)
    timezone    = models.CharField(max_length=64)
    location    = PointField()
    population  = models.PositiveIntegerField(null=True)
    country     = models.ForeignKey(WorldBorder, related_name='cities', null=True)

    class Meta:
        verbose_name_plural = 'cities'
        ordering = ['name', '-population']

    def __str__(self):
        return self.name
