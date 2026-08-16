#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# loop-down.sh — stop the PRISM 24/7 earnings loop daemon.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/logs/earnings-loop.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No earnings loop PID file found — is it running?"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  echo "Stopping earnings loop (pid $PID)..."
  kill -TERM "$PID" 2>/dev/null || true
  sleep 2
  kill -KILL "$PID" 2>/dev/null || true
else
  echo "PID $PID not running — cleaning up stale PID file."
fi

rm -f "$PID_FILE"
echo "Earnings loop stopped."
