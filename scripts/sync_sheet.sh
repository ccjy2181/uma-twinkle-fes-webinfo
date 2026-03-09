#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

SHEET_ID="${SHEET_ID:-1houH85OOb50iXVegN-Fw_j_x_1HDz9yXkAZON4rzpXA}"
SHEET_GID="${SHEET_GID:-0}"
SHEET_URL="https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}"

CSV_PATH="data/booths.csv"
JSON_PATH="data/booths.json"

TMP_CSV="$(mktemp)"
trap 'rm -f "$TMP_CSV"' EXIT

curl -fsSL "$SHEET_URL" -o "$TMP_CSV"

# Normalize line endings for stable diffs.
sed -i 's/\r$//' "$TMP_CSV"

if ! cmp -s "$TMP_CSV" "$CSV_PATH"; then
  cp "$TMP_CSV" "$CSV_PATH"
fi

python3 - "$CSV_PATH" "$JSON_PATH" <<'PY'
import csv
import json
import re
import sys

csv_path, json_path = sys.argv[1], sys.argv[2]
url_pattern = re.compile(r"https?://[^\s|,]+")

def pick(raw, keys):
    for key in keys:
        if key in raw and str(raw.get(key, "")).strip():
            return str(raw.get(key, ""))
    return ""

def split_list(value):
    if value is None:
        return []
    return [p.strip() for p in re.split(r"[|,，]", str(value)) if p.strip()]

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

rows = []
with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    for raw in reader:
        code = pick(raw, ["code", "부스번호"]).strip().upper().replace("-", "")
        if not code:
            continue

        image_text = pick(
            raw,
            [
                "image",
                "인포 이미지 다운로드 URL\n(이미지 여러장 올려주셔도 됩니다!)",
                "인포 이미지 다운로드 URL (이미지 여러장 올려주셔도 됩니다!)",
                "인포 이미지 URL",
            ],
        )
        images = dedupe_keep_order(extract_urls(image_text))

        row = {
            "code": code,
            "name": pick(raw, ["name", "부스명"]).strip() or "미등록 부스",
            "info": pick(raw, ["info", "부스 소개"]).strip(),
            "character": split_list(pick(raw, ["character", "부스 캐릭터"])),
            "images": images,
            "links": {
                "twitter": extract_urls(pick(raw, ["twitter", "트위터 링크(선택)", "트위터 링크"])),
                "pixiv": extract_urls(pick(raw, ["pixiv", "픽시브 링크(선택)", "픽시브 링크"])),
                "witchform": dedupe_keep_order(
                    extract_urls(
                        " ".join(
                            [
                                pick(raw, ["witchform", "윗치폼 통판 URL 1"]),
                                pick(raw, ["윗치폼 통판 URL 2\n(필요하신 경우)", "윗치폼 통판 URL 2"]),
                            ]
                        )
                    )
                ),
            },
        }
        rows.append(row)

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)
    f.write("\n")
PY

git add "$CSV_PATH" "$JSON_PATH"
if git diff --cached --quiet; then
  echo "[sync_sheet] no data changes"
  exit 0
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git commit -m "chore(data): sync booths from google sheet"
git push origin "$BRANCH"
echo "[sync_sheet] committed and pushed to ${BRANCH}"
