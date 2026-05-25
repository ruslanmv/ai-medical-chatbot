#!/usr/bin/env python3
"""Quick interactive smoke test for the fine-tuned model.

Usage:
    python infer.py --adapter adapters/deepseek-medos-v4
    python infer.py --adapter adapters/deepseek-medos-v4 --prompt "I have back pain"

Loads the LoRA adapter and runs a single prompt (or a REPL if --prompt
is omitted). Pretty-prints any `[card:KIND]` blocks the model emits so
you can visually confirm the schema is being learned.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def pretty_print_reply(reply: str) -> None:
    """Render the model's output with card-block highlighting."""
    card_re = re.compile(r"\[card:([a-z_]+)\]\s*([\s\S]*?)\s*\[/card\]", re.IGNORECASE)
    last = 0
    for m in card_re.finditer(reply):
        if m.start() > last:
            txt = reply[last:m.start()].strip()
            if txt:
                print(f"\n[text]\n  {txt}")
        kind = m.group(1)
        body = m.group(2).strip()
        print(f"\n┌─ [card:{kind}] " + "─" * (60 - len(kind)))
        try:
            d = json.loads(body)
            # Print key fields per kind for readability
            for k in ("title", "headline", "question", "text", "care_level", "emergency_number", "reason"):
                if k in d:
                    val = str(d[k])[:200]
                    print(f"│ {k:18s}: {val}")
            if "actions" in d:
                print(f"│ actions ({len(d['actions'])}):")
                for a in d["actions"][:5]:
                    print(f"│   - {a.get('label')}  [{a.get('value')}]")
            if "what_now" in d and d["what_now"]:
                print(f"│ what_now ({len(d['what_now'])}):")
                for s in d["what_now"][:3]:
                    print(f"│   • {s}")
        except json.JSONDecodeError:
            print(f"│ [malformed JSON]: {body[:200]}")
        print("└" + "─" * 60)
        last = m.end()
    tail = reply[last:].strip()
    if tail:
        print(f"\n[text]\n  {tail}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Quick inference test against fine-tuned MedOS")
    ap.add_argument("--adapter", type=Path, required=True)
    ap.add_argument("--prompt", default=None, help="Single prompt; omit for REPL")
    ap.add_argument("--country", default="US")
    ap.add_argument("--patient", default=None,
                    help="JSON: e.g. '{\"age\":52,\"sex\":\"M\",\"medications\":[\"lisinopril 10mg\"]}'")
    ap.add_argument("--max-new-tokens", type=int, default=512)
    args = ap.parse_args()

    from unsloth import FastLanguageModel

    print(f"[infer] loading {args.adapter}")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=str(args.adapter),
        max_seq_length=4096,
        load_in_4bit=True,
    )
    FastLanguageModel.for_inference(model)

    profile = json.loads(args.patient) if args.patient else {}
    pc_lines = []
    demo = []
    if profile.get("age"): demo.append(f"age={profile['age']}")
    if profile.get("sex"): demo.append(f"sex={profile['sex']}")
    if demo: pc_lines.append(" ".join(demo))
    if profile.get("conditions"): pc_lines.append(f"conditions={', '.join(profile['conditions'])}")
    if profile.get("allergies"): pc_lines.append(f"allergies={', '.join(profile['allergies'])}")
    if profile.get("medications"): pc_lines.append(f"medications={', '.join(profile['medications'])}")
    pc_block = "\n<patient_context>\n" + "\n".join(pc_lines) + "\n</patient_context>" if pc_lines else ""

    def ask(user_text: str) -> None:
        content = user_text + pc_block
        msg = [{"role": "user", "content": content}]
        text = tokenizer.apply_chat_template(msg, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(text, return_tensors="pt").to(model.device)
        out = model.generate(
            **inputs,
            max_new_tokens=args.max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )
        reply = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        print(f"\n>>> {user_text}")
        pretty_print_reply(reply)

    if args.prompt:
        ask(args.prompt)
        return
    print("REPL mode — type a prompt, blank line to exit.")
    while True:
        try:
            line = input("\nyou> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not line:
            break
        ask(line)


if __name__ == "__main__":
    main()
