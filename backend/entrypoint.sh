#!/bin/sh

echo "Waiting for database..."
sleep 3

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Seeding test data (admin & test accounts)..."
python manage.py seed_test_data || true

echo "Starting server..."
exec "$@"
