#!/bin/sh
docker exec -ti `docker ps | grep photo-manager_photomanager | awk '{print $1;}'` pipenv run backend/manage.py "$@"
