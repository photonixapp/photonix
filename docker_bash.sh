#!/bin/sh
docker exec -ti `docker ps | grep photo-manager | awk '{print $1;}'` bash
