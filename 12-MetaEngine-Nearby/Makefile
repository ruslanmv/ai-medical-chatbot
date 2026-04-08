.PHONY: install run run-space build test deploy-help

install:
	pip install -r 12-deploy/requirements.txt -r 12-deploy/deploy-requirements.txt

run:
	uvicorn 06-api.main:app --reload --host 0.0.0.0 --port 8090

run-space:
	python 07-ui-space/app.py

build:
	docker build -f 12-deploy/Dockerfile -t metaengine-nearby:latest .

test:
	PYTEST_ADDOPTS='' pytest -o addopts='' 09-tests

deploy-help:
	python 12-deploy/deploy_hf_space.py --help
