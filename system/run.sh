#!/bin/sh

until nc -z -v -w5 $POSTGRES_HOST 5432; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up"


>&2 echo "Running migrations"
python /srv/photonix/manage.py migrate

>&2 echo "Resetting Redis lock"
python /srv/photonix/manage.py reset_redis_locks

>&2 echo "Starting supervisor"
supervisord -c /etc/supervisord.conf
