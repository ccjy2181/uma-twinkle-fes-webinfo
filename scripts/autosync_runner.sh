#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_SCRIPT="${REPO_DIR}/scripts/sync_sheet.sh"
LOG_DIR="${REPO_DIR}/logs"
CRON_TAG="UMA_TWINKLE_SHEET_AUTOSYNC"
CUTOFF_KST="${CUTOFF_KST:-2026-03-16 00:00:00 +0900}"

mkdir -p "$LOG_DIR"

now_epoch="$(date +%s)"
cutoff_epoch="$(date -d "$CUTOFF_KST" +%s)"

if [ "$now_epoch" -ge "$cutoff_epoch" ]; then
  echo "[autosync_runner] cutoff reached (${CUTOFF_KST}), removing cron entry"
  tmp_cron="$(mktemp)"
  crontab -l 2>/dev/null | grep -v "$CRON_TAG" > "$tmp_cron" || true
  crontab "$tmp_cron" || true
  rm -f "$tmp_cron"
  exit 0
fi

echo "[autosync_runner] running sync at $(date --iso-8601=seconds)"
/bin/bash "$SYNC_SCRIPT"
