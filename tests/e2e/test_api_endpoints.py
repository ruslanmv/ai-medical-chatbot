#!/usr/bin/env python3
"""
MedOS End-to-End API Tests

Verifies that all 3 HuggingFace Spaces are running and responding
correctly, and that the Vercel frontend can proxy to the backend.

Usage:
  python tests/e2e/test_api_endpoints.py
  python tests/e2e/test_api_endpoints.py --vercel  # also test Vercel proxy
  python tests/e2e/test_api_endpoints.py --verbose
"""

import sys
import time
import json
import argparse
import requests

# ============================================================
# Configuration
# ============================================================

MEDIBOT_URL = "https://ruslanmv-medibot.hf.space"
SCANNER_URL = "https://ruslanmv-medicine-scanner.hf.space"
NEARBY_URL = "https://ruslanmv-metaengine-nearby.hf.space"
VERCEL_URL = "https://www.ai-medical-chabot.com"

TIMEOUT = 60  # seconds — covers cold starts

# ============================================================
# Test helpers
# ============================================================

passed = 0
failed = 0
errors = []


def test(name, func):
    global passed, failed
    try:
        start = time.time()
        result = func()
        elapsed = int((time.time() - start) * 1000)
        if result:
            print(f"  \033[32m✓\033[0m {name} ({elapsed}ms)")
            passed += 1
        else:
            print(f"  \033[31m✗\033[0m {name} ({elapsed}ms)")
            failed += 1
            errors.append(name)
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        print(f"  \033[31m✗\033[0m {name} ({elapsed}ms) — {str(e)[:80]}")
        failed += 1
        errors.append(f"{name}: {e}")


# ============================================================
# MediBot Tests
# ============================================================

def test_medibot_health():
    r = requests.get(f"{MEDIBOT_URL}/api/health", timeout=TIMEOUT)
    return r.status_code == 200 and r.json().get("status") == "healthy"


def test_medibot_chat_hello():
    """Chat should respond to 'hello' with a greeting."""
    r = requests.post(
        f"{MEDIBOT_URL}/api/chat",
        json={"messages": [{"role": "user", "content": "hello"}]},
        timeout=TIMEOUT,
        stream=True,
    )
    if r.status_code != 200:
        return False
    # Parse SSE stream — collect content
    content = ""
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data: ") and line != "data: [DONE]":
            try:
                data = json.loads(line[6:])
                chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                content += chunk
            except json.JSONDecodeError:
                pass
    return len(content) > 5 and any(w in content.lower() for w in ["hello", "hi", "help", "assist"])


def test_medibot_chat_medical():
    """Chat should respond to a medical question with relevant content."""
    r = requests.post(
        f"{MEDIBOT_URL}/api/chat",
        json={"messages": [{"role": "user", "content": "I have a headache, what should I do?"}]},
        timeout=TIMEOUT,
        stream=True,
    )
    if r.status_code != 200:
        return False
    content = ""
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data: ") and line != "data: [DONE]":
            try:
                data = json.loads(line[6:])
                chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                content += chunk
            except json.JSONDecodeError:
                pass
    # Should mention at least one of: rest, water, pain, paracetamol, ibuprofen, doctor
    keywords = ["rest", "water", "hydrat", "pain", "paracetamol", "ibuprofen", "doctor", "medic"]
    return len(content) > 50 and any(kw in content.lower() for kw in keywords)


def test_medibot_chat_emergency_triage():
    """Emergency messages should trigger triage response."""
    r = requests.post(
        f"{MEDIBOT_URL}/api/chat",
        json={"messages": [{"role": "user", "content": "I have severe chest pain and cannot breathe"}]},
        timeout=TIMEOUT,
        stream=True,
    )
    if r.status_code != 200:
        return False
    content = ""
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data: ") and line != "data: [DONE]":
            try:
                data = json.loads(line[6:])
                chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                content += chunk
            except json.JSONDecodeError:
                pass
    # Emergency response should mention emergency number or calling for help
    emergency_keywords = ["911", "112", "emergency", "call", "ambulance", "immediately", "urgent"]
    return len(content) > 20 and any(kw in content.lower() for kw in emergency_keywords)


# ============================================================
# Medicine Scanner Tests
# ============================================================

def test_scanner_health():
    r = requests.get(f"{SCANNER_URL}/", timeout=TIMEOUT)
    return r.status_code == 200


# ============================================================
# MetaEngine Nearby Tests
# ============================================================

def test_nearby_health():
    r = requests.get(f"{NEARBY_URL}/", timeout=TIMEOUT)
    return r.status_code == 200


def test_nearby_search():
    """Search for pharmacies in London should return results."""
    # Use Gradio API
    r = requests.post(
        f"{NEARBY_URL}/gradio_api/call/search_ui",
        json={"data": ["London", "", 3000, "pharmacy", 5]},
        timeout=TIMEOUT,
    )
    if r.status_code != 200:
        return False
    event_id = r.json().get("event_id")
    if not event_id:
        return False
    # Fetch result
    r2 = requests.get(f"{NEARBY_URL}/gradio_api/call/search_ui/{event_id}", timeout=TIMEOUT)
    text = r2.text
    data_line = next((l for l in text.split("\n") if l.startswith("data: ")), None)
    if not data_line:
        return False
    data = json.loads(data_line[6:])
    json_str = data[2] if len(data) > 2 else ""
    if not json_str:
        return False
    parsed = json.loads(json_str)
    return parsed.get("count", 0) > 0


# ============================================================
# Vercel Proxy Tests
# ============================================================

def test_vercel_health():
    r = requests.get(f"{VERCEL_URL}/api/proxy/health", timeout=TIMEOUT)
    return r.status_code == 200 and r.json().get("status") == "healthy"


def test_vercel_chat():
    """Vercel proxy should forward chat to MediBot and stream response."""
    r = requests.post(
        f"{VERCEL_URL}/api/proxy/chat",
        json={"messages": [{"role": "user", "content": "hello"}]},
        timeout=TIMEOUT,
        stream=True,
    )
    if r.status_code != 200:
        return False
    content = ""
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data: ") and line != "data: [DONE]":
            try:
                data = json.loads(line[6:])
                chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                content += chunk
            except json.JSONDecodeError:
                pass
    return len(content) > 3


# ============================================================
# Run tests
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="MedOS E2E API Tests")
    parser.add_argument("--vercel", action="store_true", help="Also test Vercel proxy")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    args = parser.parse_args()

    print("\n\033[1mMedOS E2E API Tests\033[0m\n")

    print("\033[1mMediBot (Main App)\033[0m")
    test("Health check returns 200", test_medibot_health)
    test("Chat responds to 'hello' with greeting", test_medibot_chat_hello)
    test("Chat responds to medical question with advice", test_medibot_chat_medical)
    test("Emergency triage detects chest pain", test_medibot_chat_emergency_triage)

    print("\n\033[1mMedicine Scanner\033[0m")
    test("Scanner Space is running", test_scanner_health)

    print("\n\033[1mMetaEngine Nearby\033[0m")
    test("Nearby Space is running", test_nearby_health)
    test("Search finds pharmacies in London", test_nearby_search)

    if args.vercel:
        print("\n\033[1mVercel Proxy (ai-medical-chabot.com)\033[0m")
        test("Vercel → MediBot health check", test_vercel_health)
        test("Vercel → MediBot chat streaming", test_vercel_chat)

    # Summary
    total = passed + failed
    print(f"\n{'='*50}")
    print(f"\033[1mResults: {passed} passed, {failed} failed, {total} total\033[0m")
    if errors:
        print(f"\n\033[31mFailed:\033[0m")
        for e in errors:
            print(f"  - {e}")
    print(f"{'='*50}\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
