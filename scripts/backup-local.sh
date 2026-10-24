#!/usr/bin/env bash
# THREADWORK local H2 + photo backup. Stop Spring Boot first.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="$ROOT/backend/data/threadwork.mv.db"
LOCK="$ROOT/backend/data/threadwork.lock.db"
if [[ "${DB_URL:-}" == jdbc:postgresql:* ]]; then
  echo "ERROR: A PostgreSQL/Tiger Data connection is configured. Use your provider's database backup or pg_dump." >&2
  exit 1
fi
if [[ ! -f "$DB" ]]; then
  echo "ERROR: Local H2 database not found at $DB" >&2
  exit 1
fi
if [[ -f "$LOCK" ]] || (command -v lsof >/dev/null && lsof -nP -iTCP:8080 -sTCP:LISTEN 2>/dev/null | grep -q .); then
  echo "ERROR: Stop the Java backend before copying the database to avoid an inconsistent backup." >&2
  exit 1
fi
DEST_DIR="$ROOT/backups"
mkdir -p "$DEST_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$DEST_DIR/threadwork-$STAMP.tar.gz"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/data"
cp -R "$ROOT/backend/data/." "$STAGE/data/"
tar -czf "$ARCHIVE" -C "$STAGE" data
tar -tzf "$ARCHIVE" >/dev/null
echo "Created private backup: $ARCHIVE"
echo "Contains: local H2 database and the backend/data photo directory (when present)."
if command -v shasum >/dev/null; then shasum -a 256 "$ARCHIVE"; fi
echo "Do not commit or publicly share this archive."
