#!/usr/bin/env bash
set -euo pipefail

# Detect virtual environment python
if [ -f "./.venv/bin/python" ]; then
    PYTHON="./.venv/bin/python"
elif [ -f "./venv/bin/python" ]; then
    PYTHON="./venv/bin/python"
else
    PYTHON="python3"
fi

echo "=========================================================="
echo "🛡️ PayGuard: Running End-to-End Dataset & Model Training"
echo "=========================================================="
echo "Using Python: $PYTHON"

echo -e "\n[1/6] Generating synthetic dataset (PaySim & Elliptic dynamics)..."
$PYTHON ml/generate_dataset.py

echo -e "\n[2/6] Building features & splitting data..."
$PYTHON ml/build_features.py

echo -e "\n[3/6] Training Supervised Models (RandomForest & LightGBM)..."
$PYTHON ml/train_supervised.py

echo -e "\n[4/6] Training Calibrated Anomaly Detector (IsolationForest)..."
$PYTHON ml/train_anomaly.py

echo -e "\n[5/6] Training Graph-Augmented Model (Network LogisticRegression)..."
$PYTHON ml/train_graph.py

echo -e "\n[6/6] Evaluating all models & saving figures..."
$PYTHON ml/evaluate.py

echo -e "\n✅ Training complete! Artifacts saved to models/models/ and reports/."
