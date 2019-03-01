import errno
from hashlib import md5
import os
import shutil
import tempfile

from django.conf import settings
import requests


def mkdir_p(path):
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise


def determine_destination(fn):
    extension = os.path.splitext(fn)[1][1:].lower()
    for output_filter in settings.PHOTO_OUTPUT_DIRS:
        if extension in output_filter['EXTENSIONS']:
            return output_filter['PATH']
    return None


def find_new_file_name(path):
    '''
    If a file already exists in the same place with the same name, this
    function will find a new name to use, changing the extension to
    '_1.jpg' or similar.
    '''
    counter = 1
    fn, extension = os.path.splitext(path)
    attempt = path
    while os.path.exists(attempt):
        attempt = '{}_{}{}'.format(fn, counter, extension)
        counter += 1
    return attempt


def download_file(url, destination_path):
    temp_path = tempfile.mktemp()
    with requests.get(url, stream=True) as r:
        with open(temp_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=32768):
                if chunk:
                    f.write(chunk)
    shutil.move(temp_path, destination_path)
    return destination_path


def md5sum(path):
    hash_md5 = md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()
