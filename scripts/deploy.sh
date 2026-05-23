#!/usr/bin/env bash
# THEORY — safe forward deploy. Backup → migrate (forward-only, guarded) → verify.
# Usage: DATABASE_URL=... [SCHEMA=database/schema.prisma] [BASE_URL=...] scripts/deploy.sh
set -euo pipefail

SCHEMA="${SCHEMA:-database/schema.prisma}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="${BACKUP_DIR:-./backups}/pre-deploy-${TS}.sql"
mkdir -p "$(dirname "$BACKUP")"

echo "==> 1/4 Backup -> $BACKUP"
pg_dump "${DATABASE_URL:?DATABASE_URL required}" > "$BACKUP"
echo "    backup OK ($(wc -c <"$BACKUP") bytes)"

echo "==> 2/4 prisma migrate deploy (forward-only)"
( cd backend && npx prisma migrate deploy --schema="../${SCHEMA}" )

echo "==> 3/4 prisma generate"
( cd backend && npx prisma generate --schema="../${SCHEMA}" )

echo "==> 4/4 Readiness probe"
if [ -n "${BASE_URL:-}" ]; then
  for i in $(seq 1 20); do
    if curl -fsS "${BASE_URL}/ready" | grep -q '"status":"ready"'; then
      echo "    READY"; exit 0
    fi
    echo "    waiting for readiness ($i/20)"; sleep 5
  done
  echo "ERROR: service not ready — investigate (rollback: scripts/rollback.sh $BACKUP)"; exit 1
fi
echo "Deploy complete. Backup retained at $BACKUP"
