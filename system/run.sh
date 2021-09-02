#!/bin/sh

until nc -z -v -w5 $POSTGRES_HOST 5432; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up"


>&2 echo "Running migrations"
python /srv/photonix/manage.py migrate accounts
python /srv/photonix/manage.py migrate

if [ "${ADMIN_PASSWORD}" != "" ]; then
  echo "Attempting to create admin user as ADMIN_PASSWORD as environment variable is set"
  python /srv/photonix/manage.py create_admin_from_env
fi

if [ "${DEMO}" = "1" ] || [ "${SAMPLE_DATA}" = "1" ]; then
  echo "Ensuring demo user, library and photos are created as we're running with DEMO=1 or SAMPLE_DATA=1 environment variable"
  python /srv/photonix/manage.py import_demo_photos
fi

>&2 echo "Resetting Redis lock"
python /srv/photonix/manage.py reset_redis_locks

>&2 echo "Rescheduling any required upgrade-related tasks"
python /srv/photonix/manage.py housekeeping

>&2 echo "Starting supervisor"
supervisord -c /etc/supervisord.conf
