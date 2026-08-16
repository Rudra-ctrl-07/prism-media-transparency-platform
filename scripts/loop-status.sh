#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# loop-status.sh — show PRISM earnings loop status (daemon + report summary).
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/logs/earnings-loop.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Earnings loop: RUNNING (pid $(cat "$PID_FILE"))"
else
  echo "Earnings loop: STOPPED"
fi

export PRISM_ROOT="$ROOT_DIR"
npm --prefix "$ROOT_DIR/api" run loop:status 2>/dev/null || echo "(run the API once with npm install to see detailed status)"

if [ -f "$ROOT_DIR/data/loop/REPORT.md" ]; then
  echo ""
  echo "--- Earnings report ---"
  cat "$ROOT_DIR/data/loop/REPORT.md"
fi
