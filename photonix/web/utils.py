import os

from django.core.management import utils
import redis
from redis_lock import Lock


def get_secret_key():
    # To avoid each installation having the same Django SECERT_KEY we generate
    # a random one and store it in Redis. We have to store it somewhere
    # central like Redis because if each worker generated it's own it would
    # cause problems (like JWT "Error decoding signature").

    secret_key = None

    if 'DJANGO_SECRET_KEY' in os.environ:
        secret_key = os.environ.get('DJANGO_SECRET_KEY')
    else:
        r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))
        if r.exists('django_secret_key'):
            secret_key = r.get('django_secret_key').decode('utf-8')
        else:
            # Make sure only first worker generates the key and others get from Redis
            with Lock(r, 'django_secret_key_generation_lock'):
                if r.exists('django_secret_key'):
                    secret_key = r.get('django_secret_key').decode('utf-8')
                else:
                    secret_key = utils.get_random_secret_key()
                    r.set('django_secret_key', secret_key.encode('utf-8'))

    if not secret_key:
        raise EnvironmentError('No secret key available')
    return secret_key
