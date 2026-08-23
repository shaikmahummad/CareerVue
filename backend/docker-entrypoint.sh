#!/bin/sh
set -eu

echo "Applying database migrations..."
alembic upgrade head

echo "Database migrations are up to date. Starting application..."
exec "$@"
