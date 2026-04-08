#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "HF_TOKEN is required"
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <space_id> [--private]"
  echo "Example: $0 your-username/metaengine-nearby"
  exit 1
fi

SPACE_ID="$1"
PRIVATE_FLAG="${2:-}"

python "$(dirname "$0")/deploy_hf_space.py" --space-id "$SPACE_ID" ${PRIVATE_FLAG}
