#!/usr/bin/env bash
# THEORY — restore the DB from a pre-deploy backup. DESTRUCTIVE: replaces data.
# Usage: DATABASE_URL=... scripts/rollback.sh ./backups/pre-deploy-<ts>.sql
set -euo pipefail
DUMP="${1:?path to backup .sql required}"
[ -f "$DUMP" ] || { echo "backup not found: $DUMP"; exit 1; }
echo "WARNING: restoring ${DATABASE_URL:?DATABASE_URL required} from $DUMP in 5s (Ctrl-C to abort)"
sleep 5
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DUMP"
echo "Rollback complete. Redeploy the previous code/image to match."
