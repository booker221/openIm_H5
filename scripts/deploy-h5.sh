#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
ZIP_FILE="$ROOT_DIR/dist.zip"

SSH_PORT="${SSH_PORT:-22}"
SSH_USER="${SSH_USER:-root}"
SSH_HOST="${SSH_HOST:-54.116.29.247}"
REMOTE_ZIP_PATH="${REMOTE_ZIP_PATH:-/data/wwwroot/pack/dist.zip}"
REMOTE_DEPLOY_SCRIPT="${REMOTE_DEPLOY_SCRIPT:-/data/wwwroot/deploy_dist.sh}"
DEPLOY_TARGET="${DEPLOY_TARGET:-h5}"

if ! command -v scp >/dev/null 2>&1; then
  echo "scp command not found"
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "ssh command not found"
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "zip command not found"
  exit 1
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "==> Building project"
  (
    cd "$ROOT_DIR"
    npm run build
  )
fi

if [ ! -d "$DIST_DIR" ]; then
  echo "dist directory not found: $DIST_DIR"
  exit 1
fi

echo "==> Packing dist to $ZIP_FILE"
rm -f "$ZIP_FILE"
(
  cd "$ROOT_DIR"
  zip -qr "$ZIP_FILE" dist
)

echo "==> Uploading package to ${SSH_USER}@${SSH_HOST}:${REMOTE_ZIP_PATH}"
scp -P "$SSH_PORT" "$ZIP_FILE" "${SSH_USER}@${SSH_HOST}:${REMOTE_ZIP_PATH}"

echo "==> Triggering remote deploy: ${REMOTE_DEPLOY_SCRIPT} ${DEPLOY_TARGET}"
ssh -p "$SSH_PORT" "${SSH_USER}@${SSH_HOST}" \
  "\"${REMOTE_DEPLOY_SCRIPT}\" \"${DEPLOY_TARGET}\""

echo "==> Deploy finished"
