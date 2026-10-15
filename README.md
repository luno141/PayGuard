# PayGuard — Real-Time UPI Fraud Interception Engine

> **Hackathon Project** | Pre-payment fraud detection for India's UPI ecosystem using an ensemble of LightGBM, Random Forest, Isolation Forest, and Graph-topology models.

[![Live API](https://img.shields.io/badge/API-Live%20on%20Render-brightgreen)](https://payguard-api-kj1g.onrender.com/health)
[![Swagger Docs](https://img.shields.io/badge/Swagger-API%20Docs-blue)](https://payguard-api-kj1g.onrender.com/docs)

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| **Consumer UPI Simulator** | Vercel deployment (frontend) |
| **Fraud Analyst Console** | Vercel deployment `/analyst` |
| **Risk Engine API** | https://payguard-api-kj1g.onrender.com |
| **Swagger Interactive Docs** | https://payguard-api-kj1g.onrender.com/docs |

> ⚠️ Render free tier sleeps after 15 min. If the first call is slow (~10s), hit `/health` once to wake it up before a live demo.

---

## 🧠 What It Does

PayGuard intercepts UPI payment fraud **before the transaction completes** — at the moment the user hits "Pay".

It detects:
- **Fake Refund Collect Scams** — Fraudster sends a COLLECT request telling victim "tap to receive your refund" — which actually debits the victim's account.
- **QR Code Beneficiary Mismatch** — Altered QR codes where the displayed payee doesn't match the actual destination VPA.
- **Mule Account Fan-out** — Money flowing through newly-created intermediate accounts to obscure origin.
- **Remote Access Overlay Attacks** — Payments initiated while a screen-sharing or remote-control app is active.
- **Fake KYC Social Engineering** — Payments triggered under pressure narratives during a live phone call.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   VERCEL (Frontend)                  │
│  ┌──────────────────┐   ┌────────────────────────┐  │
│  │  Consumer UPI    │   │  Fraud Analyst Console │  │
│  │  Simulator       │   │  (Analyst Dashboard)   │  │
│  │  :5173 / /       │   │  :5174 / /analyst      │  │
│  └────────┬─────────┘   └──────────┬─────────────┘  │
└───────────┼──────────────────────── ┼ ───────────────┘
            │  POST /score            │  GET /stats, /transactions
            ▼                         ▼
┌─────────────────────────────────────────────────────┐
│               RENDER (FastAPI Backend)               │
│                                                      │
│  api/main.py → api/risk.py → ml/serving.py           │
│                    │                                 │
│                    ▼                                 │
│         models/predictor.py                          │
│         ┌──────────────────────────────────┐         │
│         │  LightGBM  (45% weight)          │         │
│         │  Random Forest (35% weight)      │         │
│         │  Graph LogReg (20% weight)       │         │
│         │  Isolation Forest (anomaly flag) │         │
│         └──────────────────────────────────┘         │
│                    │                                 │
│         models/*.joblib  (pre-trained artifacts)     │
│         SQLite EventStore (data/upiguard.db)         │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Model Performance

| Metric | Score |
|---|---|
| **Precision** | 94.2% |
| **Recall** | 91.5% |
| **F1 Score** | 92.8% |
| **False Positive Rate** | 1.4% |
| **PR-AUC** | 96.3% |
| **ROC-AUC** | 98.8% |
| **P95 Latency** | 31ms |

**Per-Scenario Recall:**

| Scenario | Recall |
|---|---|
| Fake Refund Collect | 96.5% |
| QR Beneficiary Mismatch | 93.2% |
| Mule Account | 89.4% |
| Screen Share Overlay | 94.0% |
| Fake KYC Link | 91.0% |

---

## 🔬 Model Ensemble

The ensemble blends **three independent scoring pathways**:

```
final_risk = 0.50 × transaction_risk   (LightGBM 0.45 + RF 0.55 blend)
           + 0.20 × anomaly_risk       (Isolation Forest novelty score)
           + 0.30 × mule_risk          (Graph LogReg topology score)
```

**17 input features** across 5 categories:
- **Financial**: `amount_inr`, `log_amount`, `balance_drain_ratio`, `orig_drained_to_zero`, `dest_zero_start`
- **Payee**: `is_beneficiary_mismatch`, `is_new_payee`, `payee_txn_count_30d`, `zero_history_flag`
- **Device**: `device_risk_signal`, `remote_access_app_active`, `call_in_progress`
- **Linguistic**: `has_refund_keyword`, `has_action_keyword`, `message_length`
- **Composite**: `drain_and_new_payee`, `drain_and_device_risk`, `mismatch_new_payee`, `device_risk_new_payee`

---

## 📁 Repository Structure

```
PayGuard/
├── api/                    # FastAPI risk scoring engine
│   ├── main.py             # Routes: /score /health /stats /metrics /feedback /retrain
│   ├── risk.py             # Domain rule engine + risk floor logic
│   ├── schemas.py          # Pydantic request/response schemas
│   ├── model_adapter.py    # Bridge: api → ml.serving
│   └── store.py            # SQLite EventStore
│
├── ml/                     # ML pipeline
│   ├── serving.py          # Singleton model loader + inference adapter
│   ├── generate_dataset.py # Synthetic PaySim UPI dataset generator (7 fraud archetypes)
│   ├── build_features.py   # 17-feature extraction + train/test split
│   ├── train_supervised.py # LightGBM + Random Forest training
│   ├── train_anomaly.py    # Isolation Forest training
│   ├── train_graph.py      # Graph LogReg + StandardScaler training
│   └── evaluate.py         # Full cross-scenario test evaluation
│
├── models/                 # Pre-trained model artifacts (all pre-trained ✅)
│   ├── predictor.py        # PayGuardPredictor class (loads + blends all 4 models)
│   ├── supervised_lgbm.joblib
│   ├── supervised_rf.joblib
│   ├── isolation_forest.joblib  # 36MB — novelty detection
│   ├── graph_logreg.joblib
│   ├── graph_scaler.joblib
│   ├── thresholds.json     # Calibrated operating thresholds
│   └── feature_names.json
│
├── web/                    # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx                          # Consumer Payment Simulator
│   │   ├── AnalystApp.tsx                   # Fraud Analyst Console
│   │   ├── api.ts                           # API client (uses VITE_API_URL)
│   │   └── components/
│   │       └── PacketTransferSimulationModal.tsx  # Wireshark-style TCP/TLS inspector
│   ├── analyst/main-analyst.tsx             # Analyst app entry point
│   ├── vercel.json                          # SPA routing rules
│   └── .env.production                     # Points to live Render API
│
├── vercel.json             # Root multi-service Vercel config (app + web)
├── render.yaml             # Render.com 1-click deploy config
├── Dockerfile              # Docker container (Python 3.11 + LightGBM)
├── pyproject.toml          # Python package + dependencies
└── run_train.sh            # Full end-to-end training pipeline script
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Clone & Install
```bash
git clone https://github.com/luno141/PayGuard.git
cd PayGuard

# Python backend
pip install -e '.[dev]'

# Frontend
cd web && npm install
```

### 2. Run All Services
```bash
# Terminal 1 — API backend (port 8000)
uvicorn api.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Consumer Simulator (port 5173)
cd web && npm run dev

# Terminal 3 — Analyst Console (port 5174)
cd web && npm run dev:analyst
```

### 3. Open in Browser
| App | URL |
|---|---|
| Consumer Payment Simulator | http://localhost:5173 |
| Fraud Analyst Console | http://localhost:5174 |
| API Swagger Docs | http://localhost:8000/docs |

---

## 🔁 Retrain from Scratch

```bash
./run_train.sh
```

This runs the full pipeline:
1. Generate synthetic PaySim UPI dataset
2. Extract 17 features + temporal train/test split
3. Train LightGBM + Random Forest + calibrated thresholds
4. Train Isolation Forest anomaly detector
5. Train Graph LogReg mule detector
6. Evaluate cross-scenario recall and print full metrics report

Output `.joblib` artifacts are written directly to `models/`.

---

## 🧪 API Reference

### `POST /score`
Score a transaction before it completes.

```json
{
  "txn_id": "TXN-001",
  "user_id": "user-123",
  "timestamp": "2026-10-16T00:00:00+05:30",
  "amount": 4999.0,
  "direction": "DEBIT",
  "payee": {
    "vpa": "refunddesk@upi",
    "display_name": "Refund Desk",
    "first_seen": true,
    "age_days": 2
  },
  "context": {
    "request_type": "COLLECT",
    "narration": "Your refund of Rs 5000 is ready"
  },
  "device": {
    "call_in_progress": true,
    "remote_access_app_active": false
  }
}
```

**Response:**
```json
{
  "txn_id": "TXN-001",
  "risk": 85,
  "decision": "HIGH_RISK",
  "scenario": "fake_refund_collect",
  "headline": "You are about to PAY ₹4,999, not receive a refund.",
  "reasons": [...],
  "model_scores": {
    "transaction_risk": 0.85,
    "anomaly_risk": 0.84,
    "mule_risk": 0.005,
    "status": "READY"
  },
  "model_version": "v1.2-lightgbm-rf-iso-graph",
  "latency_ms": 31.4
}
```

### Other Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Model status + subsystem liveness |
| `/stats` | GET | Transaction counts and feedback stats |
| `/transactions` | GET | Full scored transaction log |
| `/metrics` | GET | Model evaluation benchmarks |
| `/feedback` | POST | Label a transaction FRAUD or LEGIT |
| `/retrain` | POST | Trigger adaptive retraining simulation |

---

## 🌐 Deployment

### Backend (Render.com)
Auto-detected via `render.yaml`. 1-click deploy:
- Build: `pip install -e '.[dev]'`
- Start: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)
Configured via root `vercel.json` with Vercel Services:
- `web` service (Vite) serves `/` and `/analyst`
- `app` service (FastAPI) serves `/api/*` and direct API routes

### Docker
```bash
docker build -t payguard .
docker run -p 8000:8000 payguard
```

---

## 🛡️ Key Design Decisions

1. **Pre-payment, not post-payment** — Risk is scored synchronously before the user confirms, not after money moves.
2. **Ensemble blending** — No single model is trusted alone. LightGBM dominates (45%) but is always checked against Isolation Forest (novelty) and Graph LogReg (network topology).
3. **Hard risk floors** — Domain rules set minimum risk scores regardless of model output. `fake_refund_collect` always floors at 85/100.
4. **Analyst feedback loop** — Analysts can label false positives/negatives which feed into the retraining pipeline.
5. **No PII stored** — The SQLite EventStore persists transaction metadata and scores, never raw UPI credentials or bank account numbers.

---

## 👥 Team

Built for the AMITY Hackathon 2026.
