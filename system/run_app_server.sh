#!/bin/sh
if [ "$ENV" = "dev" ]
then
  >&2 echo "Starting Django runserver as not in prd mode"
  python /srv/backend/manage.py runserver 0.0.0.0:8000
else
  >&2 echo "Starting Gunicorn server as in prd mode"
  cd /srv/backend && gunicorn -b 0.0.0.0:8000 web.wsgi
fi
