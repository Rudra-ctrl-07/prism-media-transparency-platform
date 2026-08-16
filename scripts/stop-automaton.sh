#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# stop-automaton.sh
#
# Stops the Conway Automaton runtime that was started by
# bootstrap-automaton.sh. Looks for a node process whose CWD is ./automaton/
# or whose command line contains `dist/index.js --run`.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTOMATON_DIR="$ROOT_DIR/automaton"

echo "Stopping Conway Automaton runtime..."

# Try ps-based kill first (Linux / macOS / WSL).
if command -v pgrep >/dev/null 2>&1; then
  PIDS=$(pgrep -f "node dist/index.js --run" || true)
  if [ -n "$PIDS" ]; then
    echo "Killing PIDs: $PIDS"
    echo "$PIDS" | xargs -r kill -TERM
    sleep 2
    # Force kill any survivors
    SURVIVORS=$(pgrep -f "node dist/index.js --run" || true)
    if [ -n "$SURVIVORS" ]; then
      echo "$SURVIVORS" | xargs -r kill -KILL 2>/dev/null || true
    fi
  else
    echo "No automaton runtime process found via pgrep."
  fi
fi

# Windows fallback — taskkill via cmd.exe
if [ -z "${PIDS:-}" ] && command -v taskkill >/dev/null 2>&1; then
  echo "Falling back to taskkill (Windows)..."
  taskkill //F //IM node.exe //FI "WINDOWTITLE eq automaton-runtime*" 2>/dev/null || true
fi

# Clear AUTOMATON_BASE_URL from .env so PRISM reverts to sandbox mode.
ENV_FILE="$ROOT_DIR/.env"
if [ -f "$ENV_FILE" ] && grep -q "^AUTOMATON_BASE_URL=" "$ENV_FILE"; then
  sed -i.bak "s|^AUTOMATON_BASE_URL=.*|# AUTOMATON_BASE_URL=|" "$ENV_FILE"
  echo "Commented out AUTOMATON_BASE_URL in $ENV_FILE (reverted to sandbox)."
fi

echo "Done."