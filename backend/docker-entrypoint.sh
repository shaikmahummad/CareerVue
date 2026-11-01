#!/bin/sh
set -eu

cd /app

echo "Applying database migrations..."
alembic -c /app/alembic.ini upgrade head

echo "Seeding reviewed career question banks..."
python seed_question_banks.py

echo "Database migrations are up to date. Starting application..."
exec "$@"
