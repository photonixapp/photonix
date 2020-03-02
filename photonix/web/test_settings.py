import tempfile

from .settings import *


DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.sqlite3',
        'NAME':     ':memory:',
        # 'OPTIONS': {
        #     # ...
        #     'timeout': 10,
        #     # ...
        # }
    }
}

DATA_DIR = tempfile.mkdtemp()
CACHE_DIR = str(Path(DATA_DIR) / 'cache')
PHOTO_RAW_PROCESSED_DIR = str(Path(DATA_DIR) / 'raw-photos-processed')
THUMBNAIL_ROOT = str(Path(CACHE_DIR) / 'thumbnails')