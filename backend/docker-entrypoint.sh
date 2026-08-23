#!/bin/sh
set -eu

echo "Applying database migrations..."
alembic upgrade head

echo "Seeding reviewed career question banks..."
python seed_question_banks.py

echo "Database migrations are up to date. Starting application..."
exec "$@"
