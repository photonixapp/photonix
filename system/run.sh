#!/bin/sh

until nc -z -v -w5 postgres 5432; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up"


>&2 echo "Running migrations"
python /srv/backend/manage.py migrate

>&2 echo "Resetting Redis lock"
python /srv/backend/manage.py reset_redis_locks

>&2 echo "Starting supervisor"
supervisord -c /etc/supervisord.conf
