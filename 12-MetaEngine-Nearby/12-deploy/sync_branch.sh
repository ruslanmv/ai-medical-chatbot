#!/usr/bin/env bash
set -euo pipefail

# Sync helper for environments where network access is available.
# Usage:
#   export GITHUB_TOKEN=...   # optional for private/authenticated push
#   12-MetaEngine-Nearby/12-deploy/sync_branch.sh

UPSTREAM_URL="https://github.com/ruslanmv/ai-medical-chatbot.git"
UPSTREAM_BRANCH="claude/remove-emergency-button-bdkt6"
CURRENT_BRANCH="$(git branch --show-current)"

if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "❌ Could not detect current git branch"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$UPSTREAM_URL"
else
  git remote add origin "$UPSTREAM_URL"
fi

# Pull upstream branch into current branch context
if [[ "$CURRENT_BRANCH" == "$UPSTREAM_BRANCH" ]]; then
  git pull --rebase origin "$UPSTREAM_BRANCH"
else
  git fetch origin "$UPSTREAM_BRANCH"
  git merge --no-edit "origin/$UPSTREAM_BRANCH"
fi

# Push current branch
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  AUTH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/ruslanmv/ai-medical-chatbot.git"
  git push "$AUTH_URL" "$CURRENT_BRANCH"
else
  git push origin "$CURRENT_BRANCH"
fi

echo "✅ Sync and push completed for branch: $CURRENT_BRANCH"
