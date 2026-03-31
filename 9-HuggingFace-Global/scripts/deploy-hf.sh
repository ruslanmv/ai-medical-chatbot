#!/usr/bin/env bash
# =============================================================================
# Deploy MedOS Global to Hugging Face Spaces
# Usage: bash scripts/deploy-hf.sh <HF_TOKEN>
# =============================================================================

set -euo pipefail

HF_TOKEN="${1:?ERROR: HF_TOKEN is required as first argument}"
SPACE_NAME="MedOS-Global"
HF_USER="ruslanmv"
SPACE_REPO="${HF_USER}/${SPACE_NAME}"
SPACE_URL="https://huggingface.co/spaces/${SPACE_REPO}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "======================================"
echo "  MedOS Global - HF Spaces Deployment"
echo "======================================"
echo ""
echo "  Space:  ${SPACE_REPO}"
echo "  Source: ${APP_DIR}"
echo ""

# Check if huggingface-cli is available, if not use git
if command -v huggingface-cli &>/dev/null; then
  echo "[1/4] Logging in to Hugging Face..."
  echo "${HF_TOKEN}" | huggingface-cli login --token "${HF_TOKEN}" 2>/dev/null || true
fi

# Create a temporary directory for the space
TMPDIR=$(mktemp -d)
trap "rm -rf ${TMPDIR}" EXIT

echo "[2/4] Preparing Space files..."

# Clone or create the space repo
if git ls-remote "https://${HF_USER}:${HF_TOKEN}@huggingface.co/spaces/${SPACE_REPO}" &>/dev/null; then
  echo "  Space exists, cloning..."
  git clone "https://${HF_USER}:${HF_TOKEN}@huggingface.co/spaces/${SPACE_REPO}" "${TMPDIR}/space" 2>/dev/null
else
  echo "  Creating new Space..."
  mkdir -p "${TMPDIR}/space"
  cd "${TMPDIR}/space"
  git init
  git remote add origin "https://${HF_USER}:${HF_TOKEN}@huggingface.co/spaces/${SPACE_REPO}"
fi

cd "${TMPDIR}/space"

echo "[3/4] Copying application files..."

# Copy all application files
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'Makefile' \
  --exclude 'scripts' \
  "${APP_DIR}/" "${TMPDIR}/space/"

# Ensure README has HF metadata at the top
echo "[4/4] Pushing to Hugging Face Spaces..."

git add -A
git diff --cached --quiet && echo "No changes to deploy." && exit 0

git -c user.name="MedOS Deploy" -c user.email="deploy@medos.ai" \
  commit -m "Deploy MedOS Global $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Push with retry
MAX_RETRIES=4
RETRY_DELAY=2
for i in $(seq 1 $MAX_RETRIES); do
  if git push origin main --force 2>/dev/null || git push origin master --force 2>/dev/null; then
    echo ""
    echo "======================================"
    echo "  Deployment successful!"
    echo "  ${SPACE_URL}"
    echo "======================================"
    echo ""
    exit 0
  fi
  echo "  Push attempt ${i}/${MAX_RETRIES} failed, retrying in ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
  RETRY_DELAY=$((RETRY_DELAY * 2))
done

echo "ERROR: Failed to push after ${MAX_RETRIES} attempts."
exit 1
