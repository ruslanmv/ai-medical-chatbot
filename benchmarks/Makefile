# MedOS benchmark suite Makefile.
#
# Quick reference:
#   make install      → pip install requirements
#   make benchmark    → full A/B run (needs OPENAI_API_KEY set in .env)
#   make medos-only   → MedOS-only smoke run (no OpenAI cost)
#   make dashboard    → CSV → HTML report
#   make all          → install + benchmark + dashboard
#   make clean        → wipe out/

PYTHON      ?= python3
MEDOS_URL   ?= http://localhost:3041
CASES       ?= dataset/cases.jsonl
CSV         ?= out/results.csv
HTML        ?= out/dashboard.html
TITLE       ?= MedOS vs ChatGPT — Medical Benchmark

.PHONY: install benchmark medos-only chatgpt-only dashboard dataset dataset-stage1 dataset-stage2 all clean help

help:
	@echo "MedOS benchmark targets:"
	@echo "  make install        — install Python deps"
	@echo "  make benchmark      — full A/B (MedOS + ChatGPT) → CSV + dashboard"
	@echo "  make medos-only     — MedOS only (skip ChatGPT, no API key needed)"
	@echo "  make chatgpt-only   — ChatGPT only (skip MedOS)"
	@echo "  make dashboard      — rebuild dashboard from existing CSV"
	@echo "  make dataset        — build the fine-tuning dataset (3 stages)"
	@echo "  make dataset-stage1 — only the live-MedOS replay (stage 1)"
	@echo "  make dataset-stage2 — stages 1 + 2 (KB annotation)"
	@echo "  make all            — install + benchmark + dashboard"
	@echo "  make clean          — remove out/"
	@echo ""
	@echo "Tunables (env vars, override on command line):"
	@echo "  MEDOS_URL=$(MEDOS_URL)"
	@echo "  CASES=$(CASES)"
	@echo "  CSV=$(CSV)"
	@echo "  HTML=$(HTML)"

install:
	$(PYTHON) -m pip install --quiet --break-system-packages -r requirements.txt

benchmark:
	@if [ ! -f .env ]; then cp .env.example .env && echo "→ created .env from template (edit it before running A/B)"; fi
	MEDOS_BASE_URL=$(MEDOS_URL) $(PYTHON) run.py --cases $(CASES) --output $(CSV)
	$(PYTHON) build_dashboard.py --csv $(CSV) --output $(HTML) --title "$(TITLE)"
	@echo ""
	@echo "✓ Done."
	@echo "  CSV:       $(CSV)"
	@echo "  Dashboard: $(HTML)"
	@echo "  Open:      file://$$(realpath $(HTML))"

medos-only:
	@if [ ! -f .env ]; then cp .env.example .env; fi
	MEDOS_BASE_URL=$(MEDOS_URL) $(PYTHON) run.py --cases $(CASES) --output $(CSV) --skip-chatgpt
	$(PYTHON) build_dashboard.py --csv $(CSV) --output $(HTML) --title "$(TITLE) (MedOS-only)"
	@echo "→ $(HTML)"

chatgpt-only:
	$(PYTHON) run.py --cases $(CASES) --output $(CSV) --skip-medos
	$(PYTHON) build_dashboard.py --csv $(CSV) --output $(HTML) --title "$(TITLE) (ChatGPT-only)"
	@echo "→ $(HTML)"

dashboard:
	$(PYTHON) build_dashboard.py --csv $(CSV) --output $(HTML) --title "$(TITLE)"
	@echo "→ $(HTML)"

dataset:
	MEDOS_BASE_URL=$(MEDOS_URL) $(PYTHON) scripts/make_dataset.py
	@echo ""
	@echo "✓ Fine-tuning dataset ready:"
	@echo "  → dataset/generated/stage3-sft.jsonl"
	@echo ""
	@echo "Inspect with:"
	@echo "  head -1 dataset/generated/stage3-sft.jsonl | python3 -m json.tool"

dataset-stage1:
	MEDOS_BASE_URL=$(MEDOS_URL) $(PYTHON) scripts/make_dataset.py --stage 1

dataset-stage2:
	MEDOS_BASE_URL=$(MEDOS_URL) $(PYTHON) scripts/make_dataset.py --stage 2

all: install benchmark

clean:
	rm -rf out/
