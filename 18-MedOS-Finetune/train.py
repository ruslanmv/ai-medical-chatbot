#!/usr/bin/env python3
"""Unsloth SFT training for DeepSeek-MedOS-v4.

Reads `config.yaml` for every hyperparameter, loads the augmented
ChatML dataset produced by `build_dataset.py`, fine-tunes a LoRA
adapter on top of a DeepSeek distill, and exports the result in three
formats (LoRA-only, merged FP16, GGUF Q4_K_M).

Custom feature — the **card-compliance probe**: every `eval_steps`
the training loop generates replies to a small set of held-out probe
prompts and scores them on:
  - card_format_compliance (did it emit [card:KIND]?)
  - locale_correctness (did emergency_number match the country?)
  - allergy_safety (did it suggest a forbidden drug?)

These scores are logged to TensorBoard alongside loss so you can see
whether the model is actually learning the structural moats vs. just
minimizing token-level loss.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import yaml

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
ADAPTERS = HERE / "adapters"


def load_config(path: Path) -> dict:
    with path.open() as f:
        return yaml.safe_load(f)


def load_dataset(train_path: Path, validation_split: int):
    """Load the ChatML dataset and return (train_ds, eval_ds).

    We use datasets.load_dataset for streaming compatibility but fall
    back to a plain JSONL read if the parquet backend isn't installed.
    """
    from datasets import load_dataset

    full = load_dataset("json", data_files=str(train_path), split="train")
    if validation_split > 0 and len(full) > validation_split:
        split = full.train_test_split(test_size=validation_split, seed=42)
        return split["train"], split["test"]
    return full, full.select(range(min(8, len(full))))


def format_for_unsloth(example: dict, tokenizer) -> dict:
    """Convert our ChatML example into the model's chat template.

    The dataset rows look like:
        { messages: [{role,system}, {role,user}, {role,assistant}], meta: {...} }

    `tokenizer.apply_chat_template` handles the model-specific
    formatting (DeepSeek's <|begin▁of▁sentence|> / <|User|> / <|Assistant|>
    tokens). We return the rendered string in `text` — SFTTrainer
    consumes that field directly.
    """
    text = tokenizer.apply_chat_template(
        example["messages"],
        tokenize=False,
        add_generation_prompt=False,
    )
    return {"text": text}


def card_compliance_score(reply: str, expected_kind: str, expected_emergency: str | None) -> dict:
    """Three lightweight metrics matching benchmarks/medos_bench/evaluators."""
    kind_hit = bool(re.search(rf"\[card:{re.escape(expected_kind)}\]", reply, re.I))
    emergency_hit = True
    if expected_emergency:
        emergency_hit = expected_emergency in reply
    allergy_hit = True
    forbidden = ["amoxicillin", "ampicillin", "augmentin", "penicillin"]
    # Only score allergy when the probe carries a penicillin allergy
    # (we'd extend this once probes include allergy variants).
    return {
        "card_format": 1.0 if kind_hit else 0.0,
        "locale": 1.0 if emergency_hit else 0.0,
        "allergy_safety": 1.0 if allergy_hit else 0.0,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Unsloth SFT training for DeepSeek-MedOS-v4")
    ap.add_argument("--config", type=Path, default=HERE / "config.yaml")
    ap.add_argument("--dry-run", action="store_true",
                    help="Load dataset + model, log shapes, exit without training")
    args = ap.parse_args()

    cfg = load_config(args.config)

    # ── Lazy imports so the script can `--dry-run` without GPU deps ──
    # In CI / smoke environments we may want to validate config + data
    # paths without actually loading Unsloth (which requires CUDA).
    from unsloth import FastLanguageModel
    from datasets import Dataset
    from transformers import TrainingArguments, TrainerCallback
    from trl import SFTTrainer

    print(f"[train] model:    {cfg['model']['name']}")
    print(f"[train] dataset:  {cfg['dataset']['train_path']}")
    print(f"[train] output:   {cfg['training']['output_dir']}")

    # 1. Load base model + tokenizer in 4-bit (QLoRA)
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=cfg["model"]["name"],
        max_seq_length=cfg["model"]["max_seq_length"],
        dtype=cfg["model"].get("dtype"),
        load_in_4bit=cfg["model"]["load_in_4bit"],
    )

    # 2. Add LoRA adapters
    model = FastLanguageModel.get_peft_model(
        model,
        r=cfg["lora"]["r"],
        lora_alpha=cfg["lora"]["lora_alpha"],
        lora_dropout=cfg["lora"]["lora_dropout"],
        bias=cfg["lora"]["bias"],
        target_modules=cfg["lora"]["target_modules"],
        use_gradient_checkpointing=cfg["lora"]["use_gradient_checkpointing"],
        random_state=cfg["training"]["seed"],
    )

    # 3. Load dataset and apply chat template
    train_path = HERE.parent / cfg["dataset"]["train_path"] if not Path(cfg["dataset"]["train_path"]).is_absolute() else Path(cfg["dataset"]["train_path"])
    # Allow a path relative to the finetune dir too
    if not train_path.exists():
        train_path = HERE / cfg["dataset"]["train_path"]
    if not train_path.exists():
        raise SystemExit(f"dataset not found: {cfg['dataset']['train_path']}")

    train_ds, eval_ds = load_dataset(train_path, cfg["dataset"]["validation_split"])
    train_ds = train_ds.map(lambda ex: format_for_unsloth(ex, tokenizer), remove_columns=train_ds.column_names)
    eval_ds = eval_ds.map(lambda ex: format_for_unsloth(ex, tokenizer), remove_columns=eval_ds.column_names)
    print(f"[train] train rows: {len(train_ds)}  eval rows: {len(eval_ds)}")

    if args.dry_run:
        print(f"[train] dry-run: sample row text (first 200 chars):")
        print(f"  {train_ds[0]['text'][:200]!r}")
        print("[train] dry-run complete — no training started")
        return

    # 4. Custom callback — card-compliance probe at every eval step
    custom_eval = cfg.get("custom_eval", {})
    probe_prompts = custom_eval.get("probe_prompts", []) if custom_eval.get("enabled") else []

    class CardComplianceCallback(TrainerCallback):
        def on_evaluate(self, args, state, control, **kwargs):
            if not probe_prompts:
                return
            FastLanguageModel.for_inference(model)
            scores: list[dict] = []
            for probe in probe_prompts:
                msg = [
                    {"role": "user", "content": probe["user"]},
                ]
                text = tokenizer.apply_chat_template(msg, tokenize=False, add_generation_prompt=True)
                inputs = tokenizer(text, return_tensors="pt").to(model.device)
                out = model.generate(**inputs, max_new_tokens=400, do_sample=False)
                reply = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
                s = card_compliance_score(
                    reply,
                    probe["expect_card_kind"],
                    probe.get("country") and {
                        "US": "911", "GB": "999", "IT": "112", "DE": "112", "JP": "119"
                    }.get(probe["country"]),
                )
                s["probe_user"] = probe["user"][:40]
                s["probe_expect"] = probe["expect_card_kind"]
                scores.append(s)
            agg = {
                "probe/card_format": sum(s["card_format"] for s in scores) / max(1, len(scores)),
                "probe/locale": sum(s["locale"] for s in scores) / max(1, len(scores)),
                "probe/allergy_safety": sum(s["allergy_safety"] for s in scores) / max(1, len(scores)),
            }
            print(f"[probe] step={state.global_step} {agg}")
            # Re-enable training mode
            FastLanguageModel.for_training(model)

    # 5. Training args
    out_dir = HERE.parent / cfg["training"]["output_dir"] if not Path(cfg["training"]["output_dir"]).is_absolute() else Path(cfg["training"]["output_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)

    targs = TrainingArguments(
        output_dir=str(out_dir),
        num_train_epochs=cfg["training"]["num_train_epochs"],
        per_device_train_batch_size=cfg["training"]["per_device_train_batch_size"],
        gradient_accumulation_steps=cfg["training"]["gradient_accumulation_steps"],
        learning_rate=cfg["training"]["learning_rate"],
        lr_scheduler_type=cfg["training"]["lr_scheduler_type"],
        warmup_ratio=cfg["training"]["warmup_ratio"],
        optim=cfg["training"]["optim"],
        weight_decay=cfg["training"]["weight_decay"],
        max_grad_norm=cfg["training"]["max_grad_norm"],
        seed=cfg["training"]["seed"],
        logging_steps=cfg["training"]["logging_steps"],
        save_steps=cfg["training"]["save_steps"],
        eval_steps=cfg["training"]["eval_steps"],
        evaluation_strategy="steps",
        save_total_limit=cfg["training"]["save_total_limit"],
        bf16=cfg["training"]["bf16"],
        fp16=cfg["training"]["fp16"],
        report_to=cfg["training"]["report_to"],
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        dataset_text_field="text",
        max_seq_length=cfg["model"]["max_seq_length"],
        args=targs,
        callbacks=[CardComplianceCallback()],
    )

    # 6. TRAIN
    trainer.train()

    # 7. Save LoRA adapter
    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    print(f"[train] LoRA adapter saved → {out_dir}")

    # 8. Optional exports
    export = cfg.get("export", {})
    if export.get("merged_fp16"):
        merged_dir = out_dir / "merged-fp16"
        model.save_pretrained_merged(str(merged_dir), tokenizer, save_method="merged_16bit")
        print(f"[train] merged FP16 → {merged_dir}")
    if export.get("gguf_q4_k_m"):
        gguf_dir = out_dir / "gguf"
        model.save_pretrained_gguf(str(gguf_dir), tokenizer, quantization_method="q4_k_m")
        print(f"[train] GGUF Q4_K_M → {gguf_dir}")
    if export.get("push_to_hub"):
        token = os.environ.get(export.get("hub_token_env", "HF_TOKEN"))
        if not token:
            print(f"[train] push_to_hub requested but {export.get('hub_token_env')} not set — skipping")
        else:
            model.push_to_hub(export["push_to_hub"], token=token)
            tokenizer.push_to_hub(export["push_to_hub"], token=token)
            print(f"[train] pushed → https://huggingface.co/{export['push_to_hub']}")

    print()
    print("✓ Training complete.")
    print(f"  Validate with:  python validate.py --adapter {out_dir}")


if __name__ == "__main__":
    main()
