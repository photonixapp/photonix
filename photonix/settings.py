"""
default values here, overriden by the presence of yaml file
"""

import os
from pathlib import Path

import yaml

import photonix
from photonix.utils import user_config_path


config = {}
with open(Path(photonix.dir_name)/'default_settings.yaml') as f:
    default_config = yaml.full_load(f)
config.update(default_config)

path = user_config_path()
if path is not None and path.exists():
    with open(path) as f:
        user_config = yaml.full_load(f)
    config.update(user_config)

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = Path(__file__).parent.parent.resolve()



# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS',
                               'localhost,127.0.0.1,[::1]').split(',')

DATABASE = config['database']

# Internationalization
# https://docs.djangoproject.com/en/1.10/topics/i18n/

LANGUAGE_CODE = 'en-gb'
TIME_ZONE = 'UTC'

STATIC_DIR = BASE_DIR / 'static'
STATIC_URL = '/static/'

# use XDG paths
MEDIA_ROOT = Path('/data')
THUMBNAIL_ROOT = MEDIA_ROOT / 'cache' / 'thumbnails'

THUMBNAIL_SIZES = [
    (256, 256, 'cover', 50),
    (1920, 1080, 'contain', 75),
]

PHOTO_INPUT_DIRS = [BASE_DIR.parent.parent / 'photos_to_import', ]
# perhaps, default photos, and special cases
# use XDG paths
PHOTO_OUTPUT_DIRS = [
    {
        'EXTENSIONS': ['jpg', 'jpeg', 'mov', 'mp4', 'm4v', '3gp'],
        'PATH': '/data/photos',
    },
    {
        'EXTENSIONS': ['cr2'],
        'PATH': '/data/raw-photos',
    },
]

# should use $XDG_DATA_HOME
if os.path.exists('/data'):
    # should use XDG_CACHE_HOME
    CACHE_DIR = '/data/cache'
    MODEL_DIR = '/data/models'
else:
    CACHE_DIR = str(Path(BASE_DIR).parent / 'data' / 'cache')
    MODEL_DIR = str(Path(BASE_DIR).parent / 'data' / 'models')

# TODO ask Damian, this should be locally
MODEL_INFO_URL = 'https://photomanager.epixstudios.co.uk/models.json'

GRAPHENE = {'SCHEMA': 'web.schema.schema'}
