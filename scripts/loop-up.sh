#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# loop-up.sh — start the PRISM 24/7 earnings loop.
#
#   1. Ensures the Conway Automaton runtime is built (pnpm install + build)
#      if ./automaton is present but dist/ is missing.
#   2. Starts the earnings loop daemon in the background with a PID file and
#      logs to logs/earnings-loop.log.
#
# Usage:
#   bash scripts/loop-up.sh
#   bash scripts/loop-up.sh --no-automaton   # skip automaton build/supervision
#
# Status: bash scripts/loop-down.sh / loop-status.sh
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTOMATON_DIR="$ROOT_DIR/automaton"
PID_FILE="$ROOT_DIR/logs/earnings-loop.pid"
LOG_FILE="$ROOT_DIR/logs/earnings-loop.log"
SKIP_AUTOMATON=0
[[ "${1:-}" == "--no-automaton" ]] && SKIP_AUTOMATON=1

mkdir -p "$ROOT_DIR/logs"

# Refuse to start a second instance.
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Earnings loop already running (pid $(cat "$PID_FILE")). Stop it first: bash scripts/loop-down.sh"
  exit 1
fi

# Build the automaton if present but not built.
if [ "$SKIP_AUTOMATON" -eq 0 ] && [ -d "$AUTOMATON_DIR" ] && [ ! -f "$AUTOMATON_DIR/dist/index.js" ]; then
  echo "[loop] Building Conway Automaton runtime (first run)..."
  (cd "$AUTOMATON_DIR" && pnpm install && pnpm build)
fi

echo "[loop] Starting 24/7 earnings loop (logs → $LOG_FILE)"
export PRISM_ROOT="$ROOT_DIR"
export EARNINGS_LOOP_AUTOMATON="$([ "$SKIP_AUTOMATON" -eq 1 ] && echo false || echo true)"
nohup npm --prefix "$ROOT_DIR/api" run loop:start > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 3
echo "[loop] Started (pid $(cat "$PID_FILE"))."
echo "  Status:  bash scripts/loop-status.sh"
echo "  Stop:    bash scripts/loop-down.sh"
echo "  Report:  tail -f $ROOT_DIR/data/loop/REPORT.md"
