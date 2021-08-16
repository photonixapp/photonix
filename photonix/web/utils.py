import logging
import os

from django.core.management import utils
from redis_lock import Lock

from photonix.photos.utils.redis import redis_connection


logger = logging.getLogger('photonix')


def get_secret_key():
    # To avoid each installation having the same Django SECERT_KEY we generate
    # a random one and store it in Redis. We have to store it somewhere
    # central like Redis because if each worker generated it's own it would
    # cause problems (like JWT "Error decoding signature").

    secret_key = None

    if 'DJANGO_SECRET_KEY' in os.environ:
        secret_key = os.environ.get('DJANGO_SECRET_KEY')
    else:
        if redis_connection.exists('django_secret_key'):
            secret_key = redis_connection.get('django_secret_key').decode('utf-8')
        else:
            # Make sure only first worker generates the key and others get from Redis
            with Lock(redis_connection, 'django_secret_key_generation_lock'):
                if redis_connection.exists('django_secret_key'):
                    secret_key = redis_connection.get('django_secret_key').decode('utf-8')
                else:
                    secret_key = utils.get_random_secret_key()
                    redis_connection.set('django_secret_key', secret_key.encode('utf-8'))

    if not secret_key:
        raise EnvironmentError('No secret key available')
    return secret_key
