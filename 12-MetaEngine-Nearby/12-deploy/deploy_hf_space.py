"""Deploy MetaEngine Nearby Hugging Face Space.

Usage:
  export HF_TOKEN=hf_xxx
  python 12-MetaEngine-Nearby/12-deploy/deploy_hf_space.py --space-id <username>/metaengine-nearby
"""

from __future__ import annotations

import argparse
from pathlib import Path
from huggingface_hub import HfApi


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy MetaEngine Nearby to Hugging Face Spaces")
    parser.add_argument("--space-id", required=True, help="Target Space id, e.g. username/metaengine-nearby")
    parser.add_argument("--private", action="store_true", help="Create Space as private if it does not exist")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api = HfApi()

    template_dir = Path(__file__).resolve().parent / "hf-space-template"
    if not template_dir.exists():
        raise FileNotFoundError(f"Template folder not found: {template_dir}")

    api.create_repo(
        repo_id=args.space_id,
        repo_type="space",
        space_sdk="gradio",
        private=args.private,
        exist_ok=True,
    )

    api.upload_folder(
        folder_path=str(template_dir),
        repo_id=args.space_id,
        repo_type="space",
        commit_message="Deploy MetaEngine Nearby Space",
    )

    print(f"✅ Deployed Space: https://huggingface.co/spaces/{args.space_id}")


if __name__ == "__main__":
    main()
