#!/bin/sh
if [ "$ENV" = "dev" ]
then
  >&2 echo "Starting Nginx in dev mode"
  nginx -c /srv/system/nginx_dev.conf
else
  >&2 echo "Starting Nginx in prd mode"
  nginx -c /srv/system/nginx_prd.conf
fi
