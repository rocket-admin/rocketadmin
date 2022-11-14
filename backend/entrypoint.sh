#!/bin/sh
>&2 echo "Start migrations..."
yarn run migration:run
exec "$@"