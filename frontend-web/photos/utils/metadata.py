import os
import re
from subprocess import Popen, PIPE
from datetime import datetime

from django.contrib.gis.geos.geometry import GEOSGeometry
from django.utils.timezone import utc


class PhotoMetadata(object):
    data = {}

    def __init__(self, path):
        result = Popen(['exiftool', path], stdout=PIPE, stdin=PIPE, stderr=PIPE).communicate()[0].decode('utf-8')
        for line in str(result).split('\n'):
            if line:
                k, v = line.split(':', 1)
                self.data[k.strip()] = v.strip()

    def get(self, attribute):
        return self.data.get(attribute)


def parse_datetime(date_str):
    if '.' in date_str:
        date_str = date_str.split('.', 1)[0]
    return datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S').replace(tzinfo=utc)


def parse_gps_location(gps_str):
    # 50 deg 49' 9.53" N, 0 deg 8' 13.33" W
    regex = r'''(\d{1,3}) deg (\d{1,2})' (\d{1,2}).(\d{2})" ([N,S]), (\d{1,3}) deg (\d{1,2})' (\d{1,2}).(\d{2})" ([E,W])'''
    m = re.search(regex, gps_str)

    latitude = float(m.group(1)) + (float(m.group(2)) / 60) + (float('{}.{}'.format(m.group(3), m.group(4))) / 60 / 100)
    if m.group(5) == 'S':
        latitude = latitude * -1

    longitude = float(m.group(6)) + (float(m.group(7)) / 60) + (float('{}.{}'.format(m.group(8), m.group(9))) / 60 / 100)
    if m.group(10) == 'W':
        longitude = longitude * -1

    return GEOSGeometry('POINT({} {})'.format(longitude, latitude))


def get_datetime(path):
    '''
    Tries to get date/time from EXIF data which works on JPEG and CR2 files.
    Failing it that it tries to find the date in the filename.
    '''
    # TODO: Use PhotoMetadata class
    # TODO: Use 'GPS Date/Time' if available as it's more accurate
    try:
        result = Popen(['exiftool', '-dateTimeOriginal', path], stdout=PIPE, stdin=PIPE, stderr=PIPE).communicate()[0].decode('utf-8')
        date_str = result.split(' : ')[1].strip()
        return parse_datetime(date_str)
    except (IndexError, ValueError):
        fn = os.path.split(path)[1]
        matched = re.search(r'(20[0-9]{2})-([0-9]{2})-([0-9]{2})\D', fn)
        if not matched:
            matched = re.search(r'\D(20[0-9]{2})([0-9]{2})([0-9]{2})\D', fn)
        if matched:
            date_str = '{}-{}-{}'.format(matched.group(1), matched.group(2), matched.group(3))
            return datetime.strptime(date_str, '%Y-%m-%d')
        return None
