#!/usr/bin/env bash
# THEORY — post-deploy smoke. Fails non-zero if any check fails.
# Usage: BASE_URL=https://staging.theory... scripts/smoke.sh
set -euo pipefail
B="${BASE_URL:?BASE_URL required}"
ok(){ echo "  PASS $1"; }
chk(){ curl -fsS -o /dev/null -w '%{http_code}' "$1"; }

echo "== smoke: $B =="
[ "$(chk "$B/health")" = 200 ] && ok "/health 200"
curl -fsS "$B/ready" | grep -q '"status":"ready"' && ok "/ready ready"
[ "$(chk "$B/openapi.json")" = 200 ] && ok "/openapi.json 200"
# /api must be standardized-envelope + auth-guarded (401 without token)
code="$(chk "$B/api/auth/me" || true)"
[ "$code" = 401 ] && ok "/api/auth/me 401 (auth enforced)"
echo "== smoke OK =="
