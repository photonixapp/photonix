import csv
import os
import sys

from django.contrib.gis.geos.geometry import GEOSGeometry
from django.contrib.gis.utils import LayerMapping
from .models import WorldBorder, City


csv.field_size_limit(sys.maxsize)

world_mapping = {
    'fips':         'FIPS',
    'iso2':         'ISO2',
    'iso3':         'ISO3',
    'un':           'UN',
    'name':         'NAME',
    'area':         'AREA',
    'population':   'POP2005',
    'region':       'REGION',
    'subregion':    'SUBREGION',
    'lon':          'LON',
    'lat':          'LAT',
    'mpoly':        'MULTIPOLYGON',
}

world_shp = os.path.abspath(
    os.path.join(os.path.dirname(__file__), 'data', 'TM_WORLD_BORDERS-0.3.shp'),
)


def load_world(verbose=True):
    WorldBorder.objects.all().delete()

    lm = LayerMapping(WorldBorder, world_shp, world_mapping, transform=False, encoding='iso-8859-1')
    lm.save(strict=True, verbose=verbose)


def load_cities():
    City.objects.all().delete()

    with open(os.path.join(os.path.dirname(__file__), 'data', 'cities1000.txt'), 'r') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter='\t')
        for row in csv_reader:
            try:
                country = WorldBorder.objects.get(iso2=row[8])
            except WorldBorder.DoesNotExist:
                country = None
            City(
                name        = row[1],
                timezone    = row[17],
                location    = GEOSGeometry('POINT({} {})'.format(row[5], row[4])),
                population  = row[14],
                country     = country,
            ).save()
