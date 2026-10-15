PYTHON ?= python3

.PHONY: setup test lint api ui analyst train

setup:
	$(PYTHON) -m pip install -e '.[dev]'

test:
	$(PYTHON) -m pytest

lint:
	$(PYTHON) -m ruff check .

train:
	$(PYTHON) ml/generate_dataset.py
	$(PYTHON) ml/build_features.py
	$(PYTHON) ml/train_supervised.py
	$(PYTHON) ml/train_anomaly.py
	$(PYTHON) ml/train_graph.py
	$(PYTHON) ml/evaluate.py

api:
	$(PYTHON) -m uvicorn api.main:app --reload --port 8000

ui:
	cd web && npm install && npm run dev

analyst:
	cd web && npm install && npm run dev:analyst
