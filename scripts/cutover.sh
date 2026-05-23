#!/usr/bin/env bash
# THEORY — rolling cutover for the prod compose stack with health gate + auto
# rollback. (ECS target: this maps to a new task-def revision + CodeDeploy
# blue/green on the ALB target group — same gate, orchestrator-managed.)
# Usage: COMPOSE=docker-compose.prod.yml scripts/cutover.sh
set -euo pipefail
C="${COMPOSE:-docker-compose.prod.yml}"
PREV="$(docker compose -f "$C" images -q api || true)"

echo "==> build new api image"
docker compose -f "$C" build api

echo "==> migrate (forward-only, guarded) is run by the image entrypoint on boot"
echo "==> rolling replace api"
docker compose -f "$C" up -d --no-deps api

echo "==> health gate (/ready)"
for i in $(seq 1 24); do
  if docker compose -f "$C" exec -T api wget -qO- http://localhost:4000/ready 2>/dev/null | grep -q '"status":"ready"'; then
    echo "READY — cutover complete"; exit 0
  fi
  echo "  waiting ($i/24)"; sleep 5
done

echo "ERROR: new api not ready — ROLLING BACK"
if [ -n "$PREV" ]; then
  docker tag "$PREV" theory-backend:rollback || true
fi
docker compose -f "$C" up -d --no-deps --force-recreate api
echo "rolled back to previous api container; investigate before retrying"; exit 1
