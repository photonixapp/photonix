import tempfile

from .settings import *


DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.sqlite3',
        'NAME':     ':memory:'
    }
}

DATA_DIR = '/monkey'# tempfile.mkdtemp()
CACHE_DIR = str(Path(DATA_DIR) / 'cache')
THUMBNAIL_ROOT = str(Path(CACHE_DIR) / 'thumbnails')
