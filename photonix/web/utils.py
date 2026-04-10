import logging
import os
from pathlib import Path

from django.core.management import utils


logger = logging.getLogger('photonix')


def _get_data_dir():
    if os.path.exists('/data'):
        return Path('/data')
    return Path(__file__).resolve().parent.parent.parent / 'data'


def get_secret_key():
    # To avoid each installation having the same Django SECRET_KEY we
    # auto-generate one on first run and persist it to a file in the data
    # directory. All workers read the same file so JWT signatures stay
    # consistent across processes.
    #
    # The file lives under cache/ because the /data mount point itself is
    # not writable — the container only mounts individual subdirectories.

    if 'DJANGO_SECRET_KEY' in os.environ:
        return os.environ['DJANGO_SECRET_KEY']

    key_file = _get_data_dir() / 'cache' / '.secret_key'
    try:
        secret_key = key_file.read_text().strip()
        if secret_key:
            return secret_key
    except FileNotFoundError:
        pass

    secret_key = utils.get_random_secret_key()
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key_file.write_text(secret_key)
    return secret_key
