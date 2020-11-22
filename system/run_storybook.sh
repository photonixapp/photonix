#!/bin/sh
if [ "$ENV" = "dev" ]
then
  >&2 echo "Starting Storybook server as not in prd mode"
  yarn storybook --quiet
fi
