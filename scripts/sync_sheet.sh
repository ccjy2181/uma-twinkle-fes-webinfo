#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

SHEET_ID="${SHEET_ID:-1houH85OOb50iXVegN-Fw_j_x_1HDz9yXkAZON4rzpXA}"
SHEET_GID="${SHEET_GID:-0}"
SHEET_URL="https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}"

JSON_PATH="data/booths.json"

TMP_CSV="$(mktemp)"
trap 'rm -f "$TMP_CSV"' EXIT

curl -fsSL "$SHEET_URL" -o "$TMP_CSV"

# Normalize line endings.
sed -i 's/\r$//' "$TMP_CSV"

python3 - "$TMP_CSV" "$JSON_PATH" <<'PY'
import csv
import json
import re
import sys
from urllib.parse import urlparse

sheet_csv_path, json_path = sys.argv[1], sys.argv[2]
url_pattern = re.compile(r"https?://[^\s|,]+")

def pick(raw, keys):
    for key in keys:
        if key in raw and str(raw.get(key, "")).strip():
            return str(raw.get(key, "")).strip()
    return ""

def extract_urls(value):
    if value is None:
        return []
    text = str(value)
    seen = set()
    out = []
    for m in url_pattern.findall(text):
        if m not in seen:
            seen.add(m)
            out.append(m)
    return out

def dedupe_keep_order(items):
    seen = set()
    out = []
    for item in items:
        if not item or item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out

def is_allowed_witchform(url):
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return False
    return host == "witchform.com" or host.endswith(".witchform.com")

with open(json_path, "r", encoding="utf-8") as f:
    booths = json.load(f)

booth_by_code = {}
for booth in booths:
    code = str(booth.get("code", "")).strip().upper().replace("-", "")
    if not code:
        continue
    booth_by_code[code] = booth
    if not isinstance(booth.get("links"), dict):
        booth["links"] = {}
    if not isinstance(booth["links"].get("witchform"), list):
        booth["links"]["witchform"] = []

changed = 0

with open(sheet_csv_path, "r", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    for raw in reader:
        code = pick(raw, ["code", "부스번호"]).strip().upper().replace("-", "")
        if not code:
            continue
        booth = booth_by_code.get(code)
        if booth is None:
            continue

        combined = " ".join(
            [
                pick(raw, ["witchform", "윗치폼 통판 URL 1"]),
                pick(raw, ["윗치폼 통판 URL 2\n(필요하신 경우)", "윗치폼 통판 URL 2"]),
            ]
        )
        next_urls = [u for u in dedupe_keep_order(extract_urls(combined)) if is_allowed_witchform(u)]
        prev_urls = booth["links"].get("witchform", [])

        if prev_urls != next_urls:
            booth["links"]["witchform"] = next_urls
            changed += 1

if changed > 0:
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(booths, f, ensure_ascii=False, indent=2)
        f.write("\n")
print(f"[sync_sheet] witchform updated booths: {changed}")
PY

git add "$JSON_PATH"
if git diff --cached --quiet; then
  echo "[sync_sheet] no witchform changes"
  exit 0
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git commit -m "chore(data): sync witchform links from google sheet"
git push origin "$BRANCH"
echo "[sync_sheet] committed and pushed to ${BRANCH}"
