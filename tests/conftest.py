import os

import mock
import pytest

from django.conf import settings


@pytest.fixture(scope='session')
def django_db_modify_db_settings(django_db_modify_db_settings,):
    os.environ['ENV'] = 'test'
    settings.DATABASES['default'] = {
        'ENGINE':   'django.db.backends.sqlite3',
        'NAME':     ':memory:'
    }


@pytest.fixture(autouse=True)
def mock_redis(request):
    mocks = ['photonix.classifiers.base_model.Lock',
             'photonix.classifiers.style.model.Lock',
             'photonix.classifiers.object.model.Lock']
    mocks = [mock.patch(x, mock.MagicMock()) for x in mocks]
    for m in mocks:
        m.start()
    yield
    for m in mocks:
        m.stop()
