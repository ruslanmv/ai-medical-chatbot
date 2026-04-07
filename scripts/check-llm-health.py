#!/usr/bin/env python3
"""
MedOS LLM Provider Health Check

Tests all models in the MedOS fallback chain against the HuggingFace
Inference Providers router. Reports status, latency, and availability.

Usage:
  HF_TOKEN=hf_xxx python scripts/check-llm-health.py
  HF_TOKEN=hf_xxx python scripts/check-llm-health.py --json
  HF_TOKEN=hf_xxx python scripts/check-llm-health.py --verbose
"""

import os
import sys
import json
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from huggingface_hub import InferenceClient
except ImportError:
    print("ERROR: pip install huggingface_hub")
    sys.exit(1)


# All models in the MedOS fallback chain (verified 2026-04-07)
MODELS = [
    # Chat LLMs (used for medical chat)
    "meta-llama/Llama-3.3-70B-Instruct:sambanova",
    "meta-llama/Llama-3.3-70B-Instruct:together",
    "meta-llama/Llama-3.3-70B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct",
    "Qwen/Qwen3-235B-A22B",
    "google/gemma-3-27b-it",
    "meta-llama/Llama-3.1-70B-Instruct",
    "Qwen/Qwen3-32B",
    "deepseek-ai/DeepSeek-V3-0324",
    "deepseek-ai/DeepSeek-R1",
    "Qwen/Qwen3-30B-A3B",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    # VLMs (used for medicine scanner)
    "Qwen/Qwen2.5-VL-72B-Instruct",
    "google/gemma-3-27b-it",
]

# Deduplicate
MODELS = list(dict.fromkeys(MODELS))


def test_model(model: str, token: str, verbose: bool = False) -> dict:
    """Test a single model with a minimal prompt."""
    start = time.time()
    try:
        client = InferenceClient(token=token)
        resp = client.chat_completion(
            model=model,
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=5,
            temperature=0.1,
        )
        latency = int((time.time() - start) * 1000)
        content = ""
        if resp and resp.choices:
            content = (resp.choices[0].message.content or "").strip()[:30]

        return {
            "model": model,
            "status": "ok",
            "latency_ms": latency,
            "response": content,
        }
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        error = str(e)[:120]
        return {
            "model": model,
            "status": "error",
            "latency_ms": latency,
            "error": error,
        }


def main():
    parser = argparse.ArgumentParser(description="MedOS LLM Provider Health Check")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show full error details")
    parser.add_argument("--token", default=os.environ.get("HF_TOKEN", ""), help="HuggingFace token")
    args = parser.parse_args()

    token = args.token
    if not token:
        print("ERROR: Set HF_TOKEN environment variable or use --token")
        sys.exit(1)

    if not args.json:
        print(f"\nMedOS LLM Health Check — Testing {len(MODELS)} models...\n")

    # Test all models in parallel
    results = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(test_model, m, token, args.verbose): m for m in MODELS}
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            if not args.json:
                model_short = result["model"].split("/")[-1]
                if result["status"] == "ok":
                    print(f"  \033[32mOK\033[0m   {model_short:50s} {result['latency_ms']:>5d}ms  {result.get('response', '')}")
                else:
                    err = result.get("error", "")[:60]
                    print(f"  \033[31mFAIL\033[0m {model_short:50s} {result['latency_ms']:>5d}ms  {err}")

    # Sort by original order
    model_order = {m: i for i, m in enumerate(MODELS)}
    results.sort(key=lambda r: model_order.get(r["model"], 999))

    ok = sum(1 for r in results if r["status"] == "ok")
    total = len(results)

    if args.json:
        output = {
            "models": results,
            "summary": {
                "total": total,
                "ok": ok,
                "error": total - ok,
                "tested_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        }
        print(json.dumps(output, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"  \033[1mSummary:\033[0m {ok}/{total} models online", end="")
        if ok == total:
            print("  \033[32m(all healthy)\033[0m")
        elif ok > 0:
            print(f"  \033[33m({total - ok} degraded)\033[0m")
        else:
            print("  \033[31m(all down!)\033[0m")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
