#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for Postgres..."
  python - <<'PY'
import os
import sys
import time

import psycopg2

url = os.environ["DATABASE_URL"]
deadline = time.time() + 60
last_error = None

while time.time() < deadline:
    try:
        conn = psycopg2.connect(url)
        conn.close()
        print("Postgres is ready.")
        sys.exit(0)
    except psycopg2.OperationalError as exc:
        last_error = exc
        time.sleep(2)

print(f"Postgres not ready after 60s: {last_error}", file=sys.stderr)
sys.exit(1)
PY
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
