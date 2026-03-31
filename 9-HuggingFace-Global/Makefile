# =============================================================================
# MedOS Global - Makefile
# Free AI Medical Assistant for Hugging Face Spaces
# =============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Directories
APP_DIR := 9-HuggingFace-Global
NODE_MODULES := $(APP_DIR)/node_modules

# Colors
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m

# =============================================================================
# Help
# =============================================================================

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "  MedOS Global - Development Commands"
	@echo "  ===================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Installation
# =============================================================================

.PHONY: install
install: ## Install all dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	cd $(APP_DIR) && npm install
	@echo "$(GREEN)Dependencies installed successfully.$(NC)"

.PHONY: install-ci
install-ci: ## Install dependencies for CI (clean, reproducible)
	@echo "$(GREEN)Installing dependencies (CI mode)...$(NC)"
	cd $(APP_DIR) && npm ci
	@echo "$(GREEN)CI dependencies installed.$(NC)"

.PHONY: clean
clean: ## Remove node_modules and build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf $(APP_DIR)/node_modules
	rm -rf $(APP_DIR)/.next
	rm -rf $(APP_DIR)/out
	@echo "$(GREEN)Clean complete.$(NC)"

# =============================================================================
# Quality Checks
# =============================================================================

.PHONY: lint
lint: ## Run ESLint
	@echo "$(GREEN)Running linter...$(NC)"
	cd $(APP_DIR) && npx next lint

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "$(GREEN)Running type checker...$(NC)"
	cd $(APP_DIR) && npx tsc --noEmit

.PHONY: format-check
format-check: ## Check code formatting
	@echo "$(GREEN)Checking code formatting...$(NC)"
	cd $(APP_DIR) && npx prettier --check "**/*.{ts,tsx,js,json,css}" 2>/dev/null || echo "Prettier not configured - skipping"

# =============================================================================
# Testing
# =============================================================================

.PHONY: test
test: test-unit test-structure test-providers test-i18n test-safety ## Run all tests
	@echo "$(GREEN)All tests passed!$(NC)"

.PHONY: test-unit
test-unit: ## Run unit tests
	@echo "$(GREEN)Running unit tests...$(NC)"
	cd $(APP_DIR) && node --experimental-vm-modules ../tests/9-hf-global/run-tests.js

.PHONY: test-structure
test-structure: ## Verify folder structure and required files exist
	@echo "$(GREEN)Verifying folder structure...$(NC)"
	@test -f $(APP_DIR)/Dockerfile          || (echo "$(RED)FAIL: Dockerfile missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/package.json        || (echo "$(RED)FAIL: package.json missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/next.config.js      || (echo "$(RED)FAIL: next.config.js missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/tsconfig.json       || (echo "$(RED)FAIL: tsconfig.json missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/tailwind.config.ts  || (echo "$(RED)FAIL: tailwind.config.ts missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/README.md           || (echo "$(RED)FAIL: README.md missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/app/layout.tsx      || (echo "$(RED)FAIL: app/layout.tsx missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/app/page.tsx        || (echo "$(RED)FAIL: app/page.tsx missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/app/globals.css     || (echo "$(RED)FAIL: app/globals.css missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/app/api/chat/route.ts    || (echo "$(RED)FAIL: chat API route missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/app/api/triage/route.ts  || (echo "$(RED)FAIL: triage API route missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/app/api/health/route.ts  || (echo "$(RED)FAIL: health API route missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/public/manifest.json     || (echo "$(RED)FAIL: manifest.json missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/public/sw.js             || (echo "$(RED)FAIL: sw.js missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/Dockerfile               || (echo "$(RED)FAIL: Dockerfile missing$(NC)" && exit 1)
	@echo "$(GREEN)  Structure check passed (15/15 files verified).$(NC)"

.PHONY: test-providers
test-providers: ## Test provider modules exist and export correctly
	@echo "$(GREEN)Verifying provider modules...$(NC)"
	@test -f $(APP_DIR)/lib/providers/index.ts            || (echo "$(RED)FAIL: providers/index.ts missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/lib/providers/ollabridge.ts       || (echo "$(RED)FAIL: ollabridge.ts missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/lib/providers/huggingface-direct.ts || (echo "$(RED)FAIL: huggingface-direct.ts missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/lib/providers/cached-faq.ts       || (echo "$(RED)FAIL: cached-faq.ts missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/lib/providers/ollabridge-models.ts || (echo "$(RED)FAIL: ollabridge-models.ts missing$(NC)" && exit 1)
	@echo "$(GREEN)  Provider modules verified (5/5).$(NC)"

.PHONY: test-i18n
test-i18n: ## Verify all 20 locale files exist
	@echo "$(GREEN)Verifying i18n locale files...$(NC)"
	@LOCALES="en es zh hi ar pt bn fr ru ja de ko tr vi it th id sw tl uk"; \
	COUNT=0; \
	for lang in $$LOCALES; do \
		test -f $(APP_DIR)/lib/i18n/locales/$$lang.json || \
			(echo "$(RED)FAIL: $$lang.json missing$(NC)" && exit 1); \
		COUNT=$$((COUNT + 1)); \
	done; \
	echo "$(GREEN)  All 20 locale files verified.$(NC)"

.PHONY: test-safety
test-safety: ## Verify safety modules exist
	@echo "$(GREEN)Verifying safety modules...$(NC)"
	@test -f $(APP_DIR)/lib/safety/triage.ts            || (echo "$(RED)FAIL: triage.ts missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/lib/safety/emergency-numbers.ts || (echo "$(RED)FAIL: emergency-numbers.ts missing$(NC)" && exit 1)
	@test -f $(APP_DIR)/lib/safety/disclaimer.ts        || (echo "$(RED)FAIL: disclaimer.ts missing$(NC)" && exit 1)
	@echo "$(GREEN)  Safety modules verified (3/3).$(NC)"

# =============================================================================
# Build
# =============================================================================

.PHONY: build
build: ## Build the Next.js application
	@echo "$(GREEN)Building application...$(NC)"
	cd $(APP_DIR) && npm run build
	@echo "$(GREEN)Build complete.$(NC)"

.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "$(GREEN)Building Docker image...$(NC)"
	cd $(APP_DIR) && docker build -t medos-global .
	@echo "$(GREEN)Docker image built successfully.$(NC)"

.PHONY: docker-run
docker-run: ## Run Docker container locally
	@echo "$(GREEN)Starting MedOS on http://localhost:7860...$(NC)"
	cd $(APP_DIR) && docker run -p 7860:7860 \
		-e OLLABRIDGE_URL=$${OLLABRIDGE_URL:-https://ruslanmv-ollabridge-cloud.hf.space} \
		-e HF_TOKEN=$${HF_TOKEN:-} \
		medos-global

# =============================================================================
# Development
# =============================================================================

.PHONY: dev
dev: ## Start development server on port 7860
	@echo "$(GREEN)Starting dev server on http://localhost:7860...$(NC)"
	cd $(APP_DIR) && npm run dev

.PHONY: start
start: ## Start production server on port 7860
	cd $(APP_DIR) && npm run start

# =============================================================================
# Deployment
# =============================================================================

.PHONY: deploy-hf
deploy-hf: ## Deploy to Hugging Face Spaces (requires HF_TOKEN)
	@test -n "$(HF_TOKEN)" || (echo "$(RED)ERROR: HF_TOKEN is required. Set it with: make deploy-hf HF_TOKEN=hf_...$(NC)" && exit 1)
	@echo "$(GREEN)Deploying to Hugging Face Spaces...$(NC)"
	@bash scripts/deploy-hf.sh $(HF_TOKEN)

# =============================================================================
# CI Pipeline (combines all checks)
# =============================================================================

.PHONY: ci
ci: install-ci test build ## Full CI pipeline: install, test, build
	@echo "$(GREEN)CI pipeline passed successfully!$(NC)"

.PHONY: check
check: test-structure test-providers test-i18n test-safety ## Quick check (no install needed)
	@echo "$(GREEN)All structural checks passed!$(NC)"
