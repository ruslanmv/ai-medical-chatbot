# DeepSeek-MedOS-v4 fine-tuning targets.
#
# Quick reference:
#   make install       — install Unsloth + TRL + deps
#   make data          — build the augmented ChatML training set
#   make train         — Unsloth SFT (QLoRA, LoRA adapter output)
#   make validate      — score the adapter against the benchmark suite
#   make infer         — REPL smoke test against the adapter
#   make all           — install + data + train + validate
#   make clean         — remove data/ and adapters/

PYTHON      ?= python3
MEDOS_URL   ?= http://localhost:3050
CONFIG      ?= config.yaml
ADAPTER     ?= adapters/deepseek-medos-v4
PROMPT      ?= I have back pain.

.PHONY: install data data-no-augment train train-dry validate infer all clean help

help:
	@echo "DeepSeek-MedOS-v4 fine-tuning targets:"
	@echo "  make install         — pip install Unsloth + TRL + deps"
	@echo "  make data            — augment + replay through MedOS → SFT dataset"
	@echo "  make data-no-augment — skip augmentation; use seed questions only"
	@echo "  make train           — Unsloth SFT training run"
	@echo "  make train-dry       — load model + dataset, print shapes, exit"
	@echo "  make validate        — run the adapter against benchmark cases"
	@echo "  make infer           — single-prompt smoke test (PROMPT=...)"
	@echo "  make all             — install + data + train + validate"
	@echo "  make clean           — remove data/ and adapters/"
	@echo ""
	@echo "Tunables:"
	@echo "  MEDOS_URL=$(MEDOS_URL)   (port your MedOS dev server is on)"
	@echo "  CONFIG=$(CONFIG)"
	@echo "  ADAPTER=$(ADAPTER)"
	@echo "  PROMPT=\"$(PROMPT)\""

install:
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r requirements.txt

data:
	MEDOS_BASE_URL=$(MEDOS_URL) $(PYTHON) build_dataset.py
	@echo ""
	@echo "✓ Training data ready: data/sft-train.jsonl"
	@wc -l data/sft-train.jsonl

data-no-augment:
	MEDOS_BASE_URL=$(MEDOS_URL) $(PYTHON) build_dataset.py --no-augment
	@wc -l data/sft-train.jsonl

train:
	$(PYTHON) train.py --config $(CONFIG)

train-dry:
	$(PYTHON) train.py --config $(CONFIG) --dry-run

validate:
	$(PYTHON) validate.py --adapter $(ADAPTER)

infer:
	$(PYTHON) infer.py --adapter $(ADAPTER) --prompt "$(PROMPT)"

all: install data train validate

clean:
	rm -rf data/ adapters/
