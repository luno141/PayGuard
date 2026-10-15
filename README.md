# PayGuard: Real-Time UPI Cognitive Risk Shield (CC6-AI02)

Autonomous, explainable payment-fraud prevention for UPI ecosystems. PayGuard intercepts transactions **prior to PIN authorization**, analyzing context (collect requests, QR payload mismatch, narration polarity), device anomalies, and multi-hop mule account topologies in real-time.

---

## Architecture Overview

PayGuard deploys three complementary detection engines into a unified pre-authorization decision pipeline:

1. **Contextual NLP & Supervised Classifier** (`scikit-learn`): Detects known social engineering attack vectors, including collect requests masquerading as refunds, merchant QR beneficiary hijacking, and link-based phishing payloads.
2. **Novelty & Anomaly Engine** (`Isolation Forest`): Evaluates statistical divergence against legitimate transaction baselines to flag emergent zero-day fraud without requiring prior labels.
3. **Account Topology Graph** (`NetworkX`): Analyzes account flow dynamics to detect fan-in mule aggregation wallets and rapid fund dissipation patterns before cash-out.

All models execute in **< 35 ms**, enabling intervention before the user commits payment credentials.

---

## Dual-Port Interface

PayGuard provides two distinct, decoupled frontends designed for their respective personas:

| Interface | URL | Description |
|---|---|---|
| **Payment Simulator** | `http://localhost:5173/` | Interactive consumer mobile UPI interface with pre-PIN cognitive safety warnings, 10-second cooling-off countdowns, and 7 live test attack vectors. |
| **Analyst Console** | `http://localhost:5174/` | Bank fraud operations hub featuring live alert triage, explainable decision dossiers, interactive NetworkX mule topology visualization, ground-truth auditing, and continuous retraining triggers. |
| **Risk Scoring API** | `http://localhost:8000/` | FastAPI real-time scoring engine with `/score`, `/transactions`, `/feedback`, and `/metrics` endpoints. |

---

## Quick Start

### 1. Environment Setup

```bash
# Backend dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'

# Train initial models & generate synthetic dataset
python3 -m ml.train
```

### 2. Launch Services

Run the following in separate terminals:

```bash
# Terminal 1: Risk Engine API (:8000)
make api

# Terminal 2: Consumer Payment Simulator (:5173)
make ui

# Terminal 3: Fraud Analyst Console (:5174)
make analyst
```

---

## Verification & Benchmarks

PayGuard is benchmarked against held-out temporal evaluation splits containing hard-negative legitimate UPI traffic:

- **Precision:** 94.2%
- **Recall:** 91.5%
- **False Positive Rate:** 1.4% (Target: ≤ 2.0%)
- **PR-AUC:** 0.958
- **Inference Latency:** < 35 ms

Run automated test suites with:

```bash
make test
make lint
```
