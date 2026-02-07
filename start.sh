#!/bin/sh
set -e

# If DATABASE_URL points to /data (persistent volume), seed the DB on first run
if echo "$DATABASE_URL" | grep -q "/data/"; then
  DB_FILE=$(echo "$DATABASE_URL" | sed 's|sqlite:///||')
  if [ ! -f "$DB_FILE" ]; then
    echo "First run detected - seeding database..."
    python seed_dummy_user.py
    echo "Database seeded."
  fi
fi

exec uvicorn api.main:app --host 0.0.0.0 --port 8080 --workers 2
