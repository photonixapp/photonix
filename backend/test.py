import os
from pathlib import Path
import sys

import pytest
import tensorflow as tf


tf.logging.set_verbosity(tf.logging.ERROR)

sys.path.insert(0, str(Path(__file__).parent.resolve()))
os.environ['DJANGO_SETTINGS_MODULE'] = 'web.settings'


if __name__ == '__main__':
    exit(pytest.main())
