#!/bin/sh
if [ "$ENV" = "dev" ]
then
  >&2 echo "Starting Storybook server as not in prd mode"
  npx storybook --quiet
fi
