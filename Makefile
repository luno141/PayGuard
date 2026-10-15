PYTHON ?= python3

.PHONY: setup test lint api ui

setup:
	$(PYTHON) -m pip install -e '.[dev]'

test:
	$(PYTHON) -m pytest

lint:
	$(PYTHON) -m ruff check .

api:
	$(PYTHON) -m uvicorn api.main:app --reload --port 8000

ui:
	cd web && npm install && npm run dev
