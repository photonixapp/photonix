#!/bin/sh
if [ "$ENV" = "dev" ]
then
  >&2 echo "Starting Vite dev server"
  npm run dev
fi
