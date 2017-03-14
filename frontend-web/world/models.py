from django.contrib.gis.db import models


class WorldBorder(models.Model):
    # Regular Django fields corresponding to the attributes in the
    # world borders shapefile.
    name = models.CharField(max_length=50)
    area = models.IntegerField()
    pop2005 = models.IntegerField('Population 2005')
    fips = models.CharField('FIPS Code', max_length=2)
    iso2 = models.CharField('2 Digit ISO', max_length=2)
    iso3 = models.CharField('3 Digit ISO', max_length=3)
    un = models.IntegerField('United Nations Code')
    region = models.IntegerField('Region Code')
    subregion = models.IntegerField('Sub-Region Code')
    lon = models.FloatField()
    lat = models.FloatField()

    # GeoDjango-specific: a geometry field (MultiPolygonField)
    mpoly = models.MultiPolygonField()

    class Meta:
        ordering = ['name']

    # Returns the string representation of the model.
    def __str__(self):              # __unicode__ on Python 2
        return self.name


class City(models.Model):
    name        = models.CharField(max_length=128)
    timezone    = models.CharField(max_length=64)
    lon         = models.FloatField()
    lat         = models.FloatField()
    population  = models.PositiveIntegerField(null=True)
    country     = models.ForeignKey(WorldBorder, related_name='cities')
