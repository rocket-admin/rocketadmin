#!/bin/sh
>&2 echo "Start migrations..."
if [ -z "${SKIP_MIGRATIONS}" ]; then
	yarn run migration:run
fi
exec "$@"
