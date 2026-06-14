#!/bin/sh
set -e

# Default DATABASE_PATH if not set
DB_PATH=${DATABASE_PATH:-/data/database.sqlite}

if [ ! -f "$DB_PATH" ]; then
  echo "[Startup] Active database not found at $DB_PATH. Copying pre-seeded template database..."
  mkdir -p "$(dirname "$DB_PATH")"
  cp /app/seed_database.sqlite "$DB_PATH"
else
  echo "[Startup] Active database found at $DB_PATH. Skipping copy."
fi

# Execute the server binary (replacing PID 1)
exec node server/index.js
