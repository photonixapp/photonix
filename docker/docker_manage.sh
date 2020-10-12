#!/bin/sh
docker exec -ti `docker ps | grep photonix_photonix | awk '{print $1;}'` python photonix/manage.py "$@"
