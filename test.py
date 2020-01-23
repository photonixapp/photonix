import os
from pathlib import Path
import sys

import pytest
import tensorflow as tf


sys.path.insert(0, str(Path(__file__).parent.resolve()))
os.environ['ENV'] = 'test'


if __name__ == '__main__':
    exit(pytest.main(['tests']))
