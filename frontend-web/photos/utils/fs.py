import errno
import os

from django.conf import settings


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
