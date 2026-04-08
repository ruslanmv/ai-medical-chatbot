#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/12-MetaEngine-Nearby/12-deploy/hf-space-template"
BUILD_DIR="/tmp/nearby-finder-deploy"
SPACE_NAME="${HF_SPACE_NAME:-ruslanmv/MetaEngine-Nearby}"

if [ -z "$HF_TOKEN" ]; then
  echo "ERROR: Set HF_TOKEN environment variable" && exit 1
fi

echo "[deploy] Preparing Nearby Finder for $SPACE_NAME..."
rm -rf "$BUILD_DIR" && mkdir -p "$BUILD_DIR"

cp "$TEMPLATE_DIR/app.py" "$BUILD_DIR/"
cp "$TEMPLATE_DIR/requirements.txt" "$BUILD_DIR/"
cp "$TEMPLATE_DIR/README.md" "$BUILD_DIR/"
cp "$TEMPLATE_DIR/Dockerfile" "$BUILD_DIR/" 2>/dev/null || true

echo "[deploy] Pushing to https://huggingface.co/spaces/$SPACE_NAME ..."
cd "$BUILD_DIR"
git init && git branch -M main && git add -A
git -c user.name="deploy" -c user.email="deploy@medos" -c commit.gpgsign=false \
  commit -m "Deploy MedOS Nearby Finder v1.0"

HF_USER=$(echo "$SPACE_NAME" | cut -d'/' -f1)
git remote add hf "https://${HF_USER}:${HF_TOKEN}@huggingface.co/spaces/${SPACE_NAME}"

for i in 1 2 3 4; do
  if git push hf main --force 2>&1 | tail -3; then break; fi
  [ "$i" -eq 4 ] && exit 1
  echo "[deploy] Retrying in $((i*2))s..."; sleep $((i*2))
done

rm -rf "$BUILD_DIR"
echo "[deploy] Done! https://huggingface.co/spaces/$SPACE_NAME"
