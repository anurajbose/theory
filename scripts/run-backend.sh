#!/bin/bash
# ─────────────────────────────────────────────────────────────
# THEORY backend supervised runner.
# Invoked by the launchd agent com.theory.backend so the API
# auto-starts at login and auto-restarts if it ever crashes.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

BACKEND_DIR="/Users/anuraj/BA Tool/pulse/backend"
cd "$BACKEND_DIR"

# Wait for PostgreSQL to accept connections before booting the API
# (launchd may start us before the DB service is fully ready).
for _ in $(seq 1 30); do
  if pg_isready -q 2>/dev/null; then break; fi
  sleep 2
done

exec npm run dev
