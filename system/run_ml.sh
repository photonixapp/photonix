#!/bin/sh
set -e

# Entrypoint for the optional photonix-ml sidecar container. It runs the same
# Django codebase as the core container but only the ML classification program
# set (see supervisord-ml.conf). It shares Postgres, Redis and the /data
# volumes with the core container and processes the classification Task queue
# directly - there is no HTTP API between them.

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

# The core container owns schema migrations, the admin/demo bootstrap, the
# Redis lock reset and housekeeping. We must NOT run migrate here (races the
# core container) and must NOT run reset_redis_locks here (it would clobber the
# locks the core container is holding). Instead we wait until the core
# container has applied all migrations before starting the classifiers.
>&2 echo "Waiting for database migrations to be applied by the core container"
until python /srv/photonix/manage.py migrate --check 2>/dev/null; do
  >&2 echo "Migrations not yet applied by core container - sleeping"
  sleep 5
done

>&2 echo "Migrations are applied"

>&2 echo "Starting supervisor (classification only)"
# exec so supervisord becomes PID 1 and receives container stop signals
exec supervisord -c /srv/system/supervisord-ml.conf
