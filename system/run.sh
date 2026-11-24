#!/bin/sh
set -e

POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

until nc -z -v -w5 "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up"

until nc -z -v -w5 "$REDIS_HOST" "$REDIS_PORT"; do
  >&2 echo "Redis is unavailable - sleeping"
  sleep 1
done

>&2 echo "Redis is up"

>&2 echo "Running migrations"
python /srv/photonix/manage.py migrate accounts
python /srv/photonix/manage.py migrate

if [ "${ADMIN_PASSWORD}" != "" ]; then
  echo "Attempting to create admin user as ADMIN_PASSWORD as environment variable is set"
  python /srv/photonix/manage.py create_admin_from_env
fi

if [ "${LOW_MEMORY}" = "1" ]; then
  # Low-memory defaults; each can still be overridden explicitly.
  export GUNICORN_WORKERS="${GUNICORN_WORKERS:-2}"
  export THUMBNAIL_WORKERS="${THUMBNAIL_WORKERS:-1}"
  export RAW_WORKERS="${RAW_WORKERS:-1}"
fi

if [ "${DEMO}" = "1" ] || [ "${SAMPLE_DATA}" = "1" ]; then
  echo "Ensuring demo user, library and photos are created as we're running with DEMO=1 or SAMPLE_DATA=1 environment variable"
  python /srv/photonix/manage.py import_demo_photos
fi

if [ "${CLASSIFICATION_DISABLED}" != "1" ]; then
  >&2 echo "Resetting Redis lock"
  python /srv/photonix/manage.py reset_redis_locks
fi

>&2 echo "Rescheduling any required upgrade-related tasks"
python /srv/photonix/manage.py housekeeping

>&2 echo "Starting supervisor"
# exec so supervisord becomes PID 1 and receives container stop signals
if [ "${CLASSIFICATION_DISABLED}" = "1" ]; then
  >&2 echo "CLASSIFICATION_DISABLED=1 - starting without classification processors"
  exec supervisord -c /srv/system/supervisord-core.conf
elif [ "${LOW_MEMORY}" = "1" ]; then
  >&2 echo "LOW_MEMORY=1 - starting one single-process classifier"
  exec supervisord -c /srv/system/supervisord-lowmem.conf
else
  exec supervisord -c /etc/supervisord.conf
fi
