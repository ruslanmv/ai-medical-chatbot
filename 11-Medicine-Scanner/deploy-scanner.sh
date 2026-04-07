#!/bin/bash
# ============================================================
# deploy-scanner.sh — Deploy Medicine Scanner to HuggingFace Spaces
#
# Uses Gradio SDK (not Docker) — HF manages the runtime.
#
# Usage:
#   HF_TOKEN=hf_xxx bash 11-Medicine-Scanner/deploy-scanner.sh
# ============================================================

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCANNER_DIR="$REPO_ROOT/11-Medicine-Scanner"
BUILD_DIR="/tmp/medicine-scanner-deploy"
SPACE_NAME="${HF_SPACE_NAME:-ruslanmv/Medicine-Scanner}"

if [ -z "$HF_TOKEN" ]; then
  echo "ERROR: Set HF_TOKEN environment variable" && exit 1
fi

echo "[deploy] Preparing Medicine Scanner for $SPACE_NAME..."
rm -rf "$BUILD_DIR" && mkdir -p "$BUILD_DIR"

# Copy only what's needed for a Gradio SDK Space
cp "$SCANNER_DIR/app.py" "$BUILD_DIR/"
cp "$SCANNER_DIR/scanner.py" "$BUILD_DIR/"
cp "$SCANNER_DIR/requirements.txt" "$BUILD_DIR/"
cp "$SCANNER_DIR/README.md" "$BUILD_DIR/"

# Copy example images
if [ -d "$SCANNER_DIR/examples" ]; then
  cp -r "$SCANNER_DIR/examples" "$BUILD_DIR/"
  echo "[deploy] Included $(ls "$BUILD_DIR/examples/"*.jpg 2>/dev/null | wc -l) example images"
fi

# Push to HuggingFace Space
echo "[deploy] Pushing to https://huggingface.co/spaces/$SPACE_NAME ..."
cd "$BUILD_DIR"
git init
git branch -M main
git add -A
git -c user.name="deploy" -c user.email="deploy@medos" -c commit.gpgsign=false \
  commit -m "Deploy Medicine Scanner v1.0.3 — Gradio SDK"

HF_USER=$(echo "$SPACE_NAME" | cut -d'/' -f1)
git remote add hf "https://${HF_USER}:${HF_TOKEN}@huggingface.co/spaces/${SPACE_NAME}"

# Retry push with exponential backoff
MAX_RETRIES=4
RETRY_DELAY=2
for i in $(seq 1 $MAX_RETRIES); do
  if git push hf main --force 2>&1 | tail -5; then
    echo "[deploy] Push successful!"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[deploy] ERROR: Push failed after $MAX_RETRIES retries"
    exit 1
  fi
  echo "[deploy] Retrying in ${RETRY_DELAY}s... (attempt $i/$MAX_RETRIES)"
  sleep $RETRY_DELAY
  RETRY_DELAY=$((RETRY_DELAY * 2))
done

rm -rf "$BUILD_DIR"

echo ""
echo "[deploy] Done! Space will build at:"
echo "  https://huggingface.co/spaces/$SPACE_NAME"
