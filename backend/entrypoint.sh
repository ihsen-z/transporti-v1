#!/bin/sh

echo "Waiting for database..."
sleep 3

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

# SECURITY: seed only on explicit opt-in — a production boot must never seed the DB.
if [ "$RUN_SEED" = "true" ]; then
    echo "Seeding test data (admin & test accounts)..."
    python manage.py seed_test_data || true
else
    echo "Skipping seed (set RUN_SEED=true to enable)."
fi

echo "Starting server..."
exec "$@"
