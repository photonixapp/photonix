#!/bin/sh
if [ "$ENV" = "dev" ]
then
  >&2 echo "Starting Vite dev server"
  npm run dev
else
  # Stay alive so supervisord does not respawn this program in a tight loop.
  exec sleep infinity
fi
