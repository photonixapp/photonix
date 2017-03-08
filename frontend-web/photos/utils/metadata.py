import os
import re
from subprocess import Popen, PIPE
from datetime import datetime

from django.utils.timezone import utc


def parse_datetime(date_str):
    if '.' in date_str:
        date_str = date_str.split('.', 1)[0]
    return datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S').replace(tzinfo=utc)


def get_time(path):
    '''
    Tries to get date/time from EXIF data which works on JPEG and CR2 files.
    Failing it that it tries to find the date in the filename.
    '''
    try:
        result = Popen(['exiftool', '-dateTimeOriginal', path], stdout=PIPE, stdin=PIPE, stderr=PIPE).communicate()[0]
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


class PhotoMetadata(object):
    data = {}

    def __init__(self, path):
        result = Popen(['exiftool', path], stdout=PIPE, stdin=PIPE, stderr=PIPE).communicate()[0]
        for line in result.split('\n'):
            if line:
                k, v = line.split(':', 1)
                self.data[k.strip()] = v.strip()

    def get(self, attribute):
        return self.data.get(attribute)
