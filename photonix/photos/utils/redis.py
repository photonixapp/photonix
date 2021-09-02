import os

import redis


redis_connection = redis.Redis(
    host=os.environ.get('REDIS_HOST', '127.0.0.1'),
    port=int(os.environ.get('REDIS_PORT', '6379')),
    db=int(os.environ.get('REDIS_DB', '0')),
    password=os.environ.get('REDIS_PASSWORD')
)
