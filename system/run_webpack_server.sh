#!/bin/sh
if [ "$ENV" = "dev" ]
then
  >&2 echo "Starting Webpack dev server as not in prd mode"
  yarn start
fi
