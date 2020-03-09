import json
import os

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.contrib.auth.models import AnonymousUser
from django.shortcuts import reverse
from django.test.client import MULTIPART_CONTENT, Client
from graphql_jwt.shortcuts import get_token
import mock
import pytest

from .factories import UserFactory


API_PATH = reverse('api')


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


# These fixtures come from the Saleor project and are licensed as BSD-3-Clause
# https://github.com/mirumee/saleor/blob/master/tests/api/conftest.py

class ApiClient(Client):
    """GraphQL API client."""

    def __init__(self, *args, **kwargs):
        user = kwargs.pop("user")
        self.set_user(user)
        super().__init__(*args, **kwargs)

    def _base_environ(self, **request):
        environ = super()._base_environ(**request)
        if not self.user.is_anonymous:
            environ.update({"HTTP_AUTHORIZATION": "JWT %s" % self.token})
        return environ

    def set_user(self, user):
        self.user = user
        if not user.is_anonymous:
            self.token = get_token(user)

    def post(self, data=None, **kwargs):
        """Send a POST request.
        This wrapper sets the `application/json` content type which is
        more suitable for standard GraphQL requests and doesn't mismatch with
        handling multipart requests in Graphene.
        """
        if data:
            data = json.dumps(data, cls=DjangoJSONEncoder)
        kwargs["content_type"] = "application/json"
        return super().post(API_PATH, data, **kwargs)

    def post_graphql(
        self,
        query,
        variables=None,
        permissions=None,
        check_no_permissions=True,
        **kwargs,
    ):
        """Dedicated helper for posting GraphQL queries.
        Sets the `application/json` content type and json.dumps the variables
        if present.
        """
        data = {"query": query}
        if variables is not None:
            data["variables"] = variables
        if data:
            data = json.dumps(data, cls=DjangoJSONEncoder)
        kwargs["content_type"] = "application/json"

        if permissions:
            if check_no_permissions:
                response = super().post(API_PATH, data, **kwargs)
                assert_no_permission(response)
            self.user.user_permissions.add(*permissions)
        return super().post(API_PATH, data, **kwargs)

    def post_multipart(self, *args, permissions=None, **kwargs):
        """Send a multipart POST request.
        This is used to send multipart requests to GraphQL API when e.g.
        uploading files.
        """
        kwargs["content_type"] = MULTIPART_CONTENT

        if permissions:
            response = super().post(API_PATH, *args, **kwargs)
            assert_no_permission(response)
            self.user.user_permissions.add(*permissions)
        return super().post(API_PATH, *args, **kwargs)


@pytest.fixture
def api_client():
    return ApiClient(user=AnonymousUser())
