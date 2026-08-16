#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# bootstrap-automaton.sh
#
# Boots the Conway Automaton sovereign-agent runtime alongside PRISM.
#
# What it does:
#   1. Clones Conway-Research/automaton into ./automaton/ (if missing).
#   2. Installs its dependencies via pnpm.
#   3. Builds it (tsc + pnpm -r build).
#   4. Starts `node dist/index.js --run` in the background.
#   5. Sets AUTOMATON_BASE_URL on PRISM's backend so /api/automaton/* proxies
#      to the live runtime.
#
# Usage:
#   bash scripts/bootstrap-automaton.sh
#
# After running, the AutomatonPanel in the PRISM UI will show "🟢 live"
# instead of "🟡 sandbox".
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTOMATON_DIR="$ROOT_DIR/automaton"
AUTOMATON_REPO="https://github.com/Conway-Research/automaton.git"
AUTOMATON_DEFAULT_PORT="${AUTOMATON_PORT:-7777}"

echo "════════════════════════════════════════════════════════════"
echo "  PRISM × Conway Automaton bootstrap"
echo "════════════════════════════════════════════════════════════"

# Step 1 — clone
if [ ! -d "$AUTOMATON_DIR" ]; then
  echo ""
  echo "[1/4] Cloning Conway-Research/automaton into ./automaton/"
  git clone "$AUTOMATON_REPO" "$AUTOMATON_DIR"
else
  echo ""
  echo "[1/4] ./automaton/ already exists — pulling latest"
  (cd "$AUTOMATON_DIR" && git pull --ff-only) || \
    echo "  (skipped pull — local changes detected)"
fi

# Step 2 — install
echo ""
echo "[2/4] Installing automaton dependencies (pnpm)"
(cd "$AUTOMATON_DIR" && pnpm install)

# Step 3 — build
echo ""
echo "[3/4] Building automaton (tsc + workspaces)"
(cd "$AUTOMATON_DIR" && pnpm build)

# Step 4 — start the runtime
echo ""
echo "[4/4] Starting automaton runtime in the background"
LOG_FILE="$ROOT_DIR/logs/automaton.log"
mkdir -p "$(dirname "$LOG_FILE")"
(cd "$AUTOMATON_DIR" && \
  AUTOMATON_PORT="$AUTOMATON_DEFAULT_PORT" \
  nohup node dist/index.js --run > "$LOG_FILE" 2>&1 &)

# Persist the base URL into PRISM's .env so the bridge proxy picks it up.
ENV_FILE="$ROOT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$ROOT_DIR/.env.example" "$ENV_FILE"
fi

if grep -q "^AUTOMATON_BASE_URL=" "$ENV_FILE" 2>/dev/null; then
  # Update in place
  sed -i.bak "s|^AUTOMATON_BASE_URL=.*|AUTOMATON_BASE_URL=http://localhost:${AUTOMATON_DEFAULT_PORT}|" "$ENV_FILE"
else
  echo "AUTOMATON_BASE_URL=http://localhost:${AUTOMATON_DEFAULT_PORT}" >> "$ENV_FILE"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Automaton runtime booting on http://localhost:${AUTOMATON_DEFAULT_PORT}"
echo "  📜 Logs: tail -f $LOG_FILE"
echo "  🌐 PRISM backend picks up AUTOMATON_BASE_URL from $ENV_FILE"
echo "  🔄 Restart PRISM's API process for the env change to take effect:"
echo "       cd api && npm run dev"
echo "════════════════════════════════════════════════════════════"