#!/bin/sh
>&2 echo "Start migrations..."
if [ -z "${SKIP_MIGRATIONS}" ]; then
	pnpm run migration:run
fi
exec "$@"
