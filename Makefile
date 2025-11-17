.PHONY: help install install-dev install-gpu clean lint format test test-cov test-unit test-integration run-chatbot run-interviewer build check type-check security-check docs serve-docs clean-pyc clean-test clean-build clean-all

# ANSI color codes
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Python and UV configuration
PYTHON := python3
UV := uv
PYTEST := pytest
BLACK := black
ISORT := isort
FLAKE8 := flake8
MYPY := mypy
PYLINT := pylint

# Directories
SRC_DIR := 5-HuggingFace 8-Interviewer 2-Data
TEST_DIR := tests
DOCS_DIR := docs

help: ## Show this help message
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  AI Medical Chatbot - Production-Ready Makefile$(NC)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)Available targets:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)Author:$(NC) Ruslan Magana Vsevolodovna"
	@echo "$(YELLOW)Website:$(NC) https://ruslanmv.com"
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(NC)"

install: ## Install production dependencies using uv
	@echo "$(BLUE)Installing production dependencies...$(NC)"
	@command -v uv >/dev/null 2>&1 || { echo "$(RED)Error: uv is not installed. Please install it first: pip install uv$(NC)"; exit 1; }
	$(UV) pip install -e .
	@echo "$(GREEN)✓ Production dependencies installed successfully$(NC)"

install-dev: ## Install development dependencies using uv
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	@command -v uv >/dev/null 2>&1 || { echo "$(RED)Error: uv is not installed. Please install it first: pip install uv$(NC)"; exit 1; }
	$(UV) pip install -e ".[dev]"
	@echo "$(GREEN)✓ Development dependencies installed successfully$(NC)"

install-gpu: ## Install GPU dependencies using uv
	@echo "$(BLUE)Installing GPU dependencies...$(NC)"
	@command -v uv >/dev/null 2>&1 || { echo "$(RED)Error: uv is not installed. Please install it first: pip install uv$(NC)"; exit 1; }
	$(UV) pip install -e ".[gpu]"
	@echo "$(GREEN)✓ GPU dependencies installed successfully$(NC)"

install-all: ## Install all dependencies (dev + gpu)
	@echo "$(BLUE)Installing all dependencies...$(NC)"
	@command -v uv >/dev/null 2>&1 || { echo "$(RED)Error: uv is not installed. Please install it first: pip install uv$(NC)"; exit 1; }
	$(UV) pip install -e ".[all]"
	@echo "$(GREEN)✓ All dependencies installed successfully$(NC)"

sync: ## Sync dependencies with pyproject.toml using uv
	@echo "$(BLUE)Syncing dependencies...$(NC)"
	$(UV) pip sync
	@echo "$(GREEN)✓ Dependencies synced successfully$(NC)"

format: ## Format code with black and isort
	@echo "$(BLUE)Formatting code...$(NC)"
	$(BLACK) $(SRC_DIR)
	$(ISORT) $(SRC_DIR)
	@echo "$(GREEN)✓ Code formatted successfully$(NC)"

lint: ## Run all linters (flake8, pylint)
	@echo "$(BLUE)Running linters...$(NC)"
	@echo "$(YELLOW)Running flake8...$(NC)"
	-$(FLAKE8) $(SRC_DIR) --max-line-length=100 --extend-ignore=E203,W503
	@echo "$(YELLOW)Running pylint...$(NC)"
	-$(PYLINT) $(SRC_DIR) --max-line-length=100
	@echo "$(GREEN)✓ Linting completed$(NC)"

type-check: ## Run type checking with mypy
	@echo "$(BLUE)Running type checking...$(NC)"
	$(MYPY) $(SRC_DIR) --ignore-missing-imports
	@echo "$(GREEN)✓ Type checking completed$(NC)"

security-check: ## Run security checks with bandit
	@echo "$(BLUE)Running security checks...$(NC)"
	@command -v bandit >/dev/null 2>&1 || $(UV) pip install bandit
	bandit -r $(SRC_DIR) -ll
	@echo "$(GREEN)✓ Security checks completed$(NC)"

check: format lint type-check ## Run all code quality checks
	@echo "$(GREEN)✓ All checks completed successfully$(NC)"

test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	$(PYTEST) $(TEST_DIR) -v
	@echo "$(GREEN)✓ All tests passed$(NC)"

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	$(PYTEST) $(TEST_DIR) -v -m unit
	@echo "$(GREEN)✓ Unit tests passed$(NC)"

test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(NC)"
	$(PYTEST) $(TEST_DIR) -v -m integration
	@echo "$(GREEN)✓ Integration tests passed$(NC)"

test-cov: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	$(PYTEST) $(TEST_DIR) --cov=$(SRC_DIR) --cov-report=html --cov-report=term-missing
	@echo "$(GREEN)✓ Coverage report generated at htmlcov/index.html$(NC)"

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	$(PYTEST) $(TEST_DIR) -v --maxfail=1 --ff -x

run-chatbot: ## Run the medical chatbot application
	@echo "$(BLUE)Starting Medical Chatbot...$(NC)"
	$(PYTHON) 5-HuggingFace/app.py
	@echo "$(GREEN)✓ Chatbot started$(NC)"

run-interviewer: ## Run the medical interviewer application
	@echo "$(BLUE)Starting Medical Interviewer...$(NC)"
	$(PYTHON) 8-Interviewer/hf/app.py
	@echo "$(GREEN)✓ Interviewer started$(NC)"

build: ## Build distribution packages
	@echo "$(BLUE)Building distribution packages...$(NC)"
	$(PYTHON) -m build
	@echo "$(GREEN)✓ Distribution packages built successfully$(NC)"

docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	@command -v sphinx-build >/dev/null 2>&1 || $(UV) pip install sphinx sphinx-rtd-theme
	cd $(DOCS_DIR) && $(MAKE) html
	@echo "$(GREEN)✓ Documentation generated$(NC)"

serve-docs: docs ## Serve documentation locally
	@echo "$(BLUE)Serving documentation at http://localhost:8000$(NC)"
	$(PYTHON) -m http.server 8000 --directory $(DOCS_DIR)/_build/html

clean-pyc: ## Remove Python file artifacts
	@echo "$(BLUE)Cleaning Python artifacts...$(NC)"
	find . -type f -name '*.py[co]' -delete
	find . -type d -name '__pycache__' -delete
	@echo "$(GREEN)✓ Python artifacts cleaned$(NC)"

clean-test: ## Remove test and coverage artifacts
	@echo "$(BLUE)Cleaning test artifacts...$(NC)"
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	rm -rf .mypy_cache
	@echo "$(GREEN)✓ Test artifacts cleaned$(NC)"

clean-build: ## Remove build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info
	rm -rf .eggs/
	@echo "$(GREEN)✓ Build artifacts cleaned$(NC)"

clean: clean-pyc clean-test clean-build ## Remove all artifacts
	@echo "$(GREEN)✓ All artifacts cleaned$(NC)"

clean-all: clean ## Remove all artifacts including venv
	@echo "$(BLUE)Removing virtual environments...$(NC)"
	rm -rf venv/
	rm -rf .venv/
	rm -rf my_venv/
	@echo "$(GREEN)✓ Everything cleaned$(NC)"

verify-install: ## Verify installation
	@echo "$(BLUE)Verifying installation...$(NC)"
	@$(PYTHON) --version
	@echo "$(YELLOW)Python version:$(NC) $$($(PYTHON) --version)"
	@echo "$(YELLOW)UV version:$(NC) $$($(UV) --version 2>/dev/null || echo 'Not installed')"
	@echo "$(YELLOW)Installed packages:$(NC)"
	@$(UV) pip list | head -20
	@echo "$(GREEN)✓ Installation verified$(NC)"

pre-commit: format lint type-check test ## Run all pre-commit checks
	@echo "$(GREEN)✓ All pre-commit checks passed$(NC)"

ci: clean install-dev check test-cov ## Run CI pipeline
	@echo "$(GREEN)✓ CI pipeline completed successfully$(NC)"

deploy-check: ## Check if ready for deployment
	@echo "$(BLUE)Checking deployment readiness...$(NC)"
	@echo "$(YELLOW)1. Checking pyproject.toml...$(NC)"
	@test -f pyproject.toml && echo "$(GREEN)✓ pyproject.toml exists$(NC)" || echo "$(RED)✗ pyproject.toml missing$(NC)"
	@echo "$(YELLOW)2. Checking LICENSE...$(NC)"
	@test -f LICENSE && echo "$(GREEN)✓ LICENSE exists$(NC)" || echo "$(RED)✗ LICENSE missing$(NC)"
	@echo "$(YELLOW)3. Checking README.md...$(NC)"
	@test -f README.md && echo "$(GREEN)✓ README.md exists$(NC)" || echo "$(RED)✗ README.md missing$(NC)"
	@echo "$(YELLOW)4. Checking tests...$(NC)"
	@test -d tests && echo "$(GREEN)✓ tests directory exists$(NC)" || echo "$(RED)✗ tests directory missing$(NC)"
	@echo "$(GREEN)✓ Deployment check completed$(NC)"

version: ## Show version information
	@echo "$(BLUE)Version Information$(NC)"
	@echo "$(YELLOW)Project:$(NC) ai-medical-chatbot"
	@echo "$(YELLOW)Version:$(NC) 2.0.0"
	@echo "$(YELLOW)Author:$(NC) Ruslan Magana Vsevolodovna"
	@echo "$(YELLOW)Website:$(NC) https://ruslanmv.com"

info: ## Show project information
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  AI Medical Chatbot - Project Information$(NC)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)Project Name:$(NC)    ai-medical-chatbot"
	@echo "$(YELLOW)Version:$(NC)        2.0.0"
	@echo "$(YELLOW)Author:$(NC)         Ruslan Magana Vsevolodovna"
	@echo "$(YELLOW)Website:$(NC)        https://ruslanmv.com"
	@echo "$(YELLOW)License:$(NC)        Apache 2.0"
	@echo "$(YELLOW)Description:$(NC)    Production-ready AI Medical Chatbot"
	@echo ""
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(NC)"
