#!/usr/bin/env bash
# Checks a THREADWORK archive without extracting or changing local data.
set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo "Usage: bash scripts/check-local-backup.sh backups/threadwork-YYYYMMDD-HHMMSS.tar.gz" >&2
  exit 2
fi
FILE="$1"
[[ -f "$FILE" ]] || { echo "Archive not found: $FILE" >&2; exit 1; }
tar -tzf "$FILE" >/dev/null
if ! tar -tzf "$FILE" | grep -q '^data/threadwork.mv.db$'; then
  echo "ERROR: Archive does not include the local H2 database." >&2
  exit 1
fi
echo "Archive structure is readable and includes the H2 database."
echo "This is not a full restore test. See docs/DATA_SAFETY.md for recovery steps."
