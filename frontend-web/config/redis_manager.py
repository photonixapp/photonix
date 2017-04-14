import os

import redis

from .initial import initial_data
from web.utils import notify_ui


r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))


class RedisManager(object):
    '''
    State key/value store base class for the global and session state. Backed by
    Redis. All getting and setting should happen via this class. Keys must be
    defined in initial.py before use. A value can be any type that is JSON
    serializable.
    '''

    def __init__(self):
        self._redis_prefix = 'photomanager:{}:'.format(self._type)
        self.set_initial()
        super().__init__()

    def _redis_key(self, key):
        return '{}:{}'.format(self._redis_prefix, key)

    def set_initial(self):
        for key, val in initial_data[self._type].items():
            r.set(self._redis_key(key), val)

    def get(self, key):
        if key not in initial_data[self._type]:
            raise KeyError('Key \'{}\' not in \'{}\''.format(key, self._type))
        val = r.get(self._redis_key(key))
        return val

    def set(self, key, val):
        if key not in initial_data[self._type]:
            raise KeyError('Key \'{}\' not in \'{}\''.format(key, self._type))
        r.set(self._redis_key(key), val)
        notify_ui(self._type, {key: val})
        return True

    def increment(self, key):
        if key not in initial_data[self._type]:
            raise KeyError('Key \'{}\' not in \'{}\''.format(key, self._type))
        val = r.incr(self._redis_key(key))
        notify_ui(self._type, {key: val})
        return val

    def decrement(self, key):
        if key not in initial_data[self._type]:
            raise KeyError('Key \'{}\' not in \'{}\''.format(key, self._type))
        val = r.decr(self._redis_key(key))
        notify_ui(self._type, {key: val})
        return val

    def push(self, key, val):
        raise NotImplementedError()

    def pop(self, key):
        raise NotImplementedError()

    def get_all(self):
        data = {}
        for key in initial_data[self._type].keys():
            data[key] = r.get(self._redis_key(key))
        return data

    def delete_obsolete(self):
        raise NotImplementedError()
