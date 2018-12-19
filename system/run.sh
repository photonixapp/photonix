#!/bin/sh

until nc -z -v -w5 postgres 5432; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up"


>&2 echo "Running migrations"
pipenv run python /srv/backend/manage.py migrate

>&2 echo "Starting supervisor"
supervisord -c /etc/supervisord.conf
