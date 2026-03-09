#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNNER="${REPO_DIR}/scripts/autosync_runner.sh"
LOG_FILE="${REPO_DIR}/logs/autosync.log"
CRON_TAG="UMA_TWINKLE_SHEET_AUTOSYNC"

mkdir -p "${REPO_DIR}/logs"

if [ ! -x "$RUNNER" ]; then
  chmod +x "$RUNNER"
fi

if [ ! -x "${REPO_DIR}/scripts/sync_sheet.sh" ]; then
  chmod +x "${REPO_DIR}/scripts/sync_sheet.sh"
fi

tmp_cron="$(mktemp)"
crontab -l 2>/dev/null | grep -v "$CRON_TAG" > "$tmp_cron" || true
echo "*/10 * * * * /bin/bash \"$RUNNER\" >> \"$LOG_FILE\" 2>&1 # $CRON_TAG" >> "$tmp_cron"
crontab "$tmp_cron"
rm -f "$tmp_cron"

echo "[install_autosync_cron] installed:"
crontab -l | grep "$CRON_TAG" || true
