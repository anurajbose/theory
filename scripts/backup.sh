#!/usr/bin/env bash
# THEORY — on-demand / cron logical backup with retention + optional S3 push.
# Usage: DATABASE_URL=... [BACKUP_DIR=./backups] [RETENTION_DAYS=7]
#        [S3_BUCKET=s3://bucket/prefix] scripts/backup.sh
set -euo pipefail
DIR="${BACKUP_DIR:-./backups}"; mkdir -p "$DIR"
RET="${RETENTION_DAYS:-7}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DIR/theory-${TS}.sql.gz"

pg_dump "${DATABASE_URL:?DATABASE_URL required}" | gzip > "$OUT"
echo "backup OK: $OUT ($(wc -c <"$OUT") bytes)"

# verify the dump is non-trivial and gzip-valid
gzip -t "$OUT" && [ "$(wc -c <"$OUT")" -gt 1000 ] || { echo "ERROR: backup invalid"; exit 1; }

if [ -n "${S3_BUCKET:-}" ]; then
  aws s3 cp "$OUT" "${S3_BUCKET%/}/$(basename "$OUT")" --only-show-errors && echo "uploaded to $S3_BUCKET"
fi

find "$DIR" -name 'theory-*.sql.gz' -mtime +"$RET" -print -delete
echo "retention: pruned > ${RET}d"
