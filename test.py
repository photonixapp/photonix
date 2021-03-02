import os
from pathlib import Path
import sys

import pytest
import tensorflow as tf


sys.path.insert(0, str(Path(__file__).parent.resolve()))
os.environ['ENV'] = 'test'


if __name__ == '__main__':
    pytest_args = ['tests']
    if len(sys.argv) > 1:
        pytest_args = sys.argv[1:]
        if not pytest_args[0].startswith('tests/'):
            pytest_args[0] = 'tests/' + pytest_args[0]
        if not pytest_args[0].endswith('.py'):
            pytest_args[0] = pytest_args[0] + '.py'
    exit(pytest.main(pytest_args))
