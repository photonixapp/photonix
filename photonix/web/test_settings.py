import os
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
MODEL_DIR = str(Path(DATA_DIR) / 'models')
PHOTO_RAW_PROCESSED_DIR = str(Path(DATA_DIR) / 'raw-photos-processed')
THUMBNAIL_ROOT = str(Path(CACHE_DIR) / 'thumbnails')

# The location classifier's dataset (cities.bin) is built offline and placed in
# the real models dir (data/models/location) rather than published in the
# downloadable manifest, so its version isn't fetchable over the network. Expose
# that already-present artifact to the tests via a symlink so the location model
# loads offline through the version.txt short-circuit, exactly as the dev stack
# does. Other models are untouched and keep their normal download behaviour.
_real_location_dir = str(Path('/data') / 'models' / 'location')
if os.path.isdir(_real_location_dir):
    os.makedirs(MODEL_DIR, exist_ok=True)
    _test_location_dir = os.path.join(MODEL_DIR, 'location')
    if not os.path.exists(_test_location_dir):
        try:
            os.symlink(_real_location_dir, _test_location_dir)
        except OSError:
            pass