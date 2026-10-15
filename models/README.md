# 🛡️ PayGuard - Production Inference Package

This directory contains the trained PayGuard fraud detection models, calibrated decision thresholds, and ready-to-use **Python** and **TypeScript** inference clients.

---

## 📁 Package Contents

```
.
├── models/                     # Trained weights & calibrated threshold configs
│   ├── supervised_lgbm.joblib  # LightGBM Classifier (Primary supervised tree)
│   ├── supervised_rf.joblib    # Random Forest Classifier (Supervised ensemble)
│   ├── isolation_forest.joblib # Isolation Forest (Unsupervised zero-day anomaly detector)
│   ├── graph_logreg.joblib     # Graph-augmented Logistic Regression (Mule network model)
│   ├── graph_scaler.joblib     # Standard scaler for graph features
│   ├── thresholds.json         # Calibrated operating decision thresholds
│   └── feature_names.json      # Ordered feature definitions
├── predictor.py                # Python inference engine & CLI entrypoint
├── predictor.ts                # TypeScript inference client with strong types
├── requirements.txt            # Minimal runtime Python dependencies
└── INTEGRATION.md              # Detailed integration guide
```

---

## ⚡ Quick Start

### 1. Install Runtime Dependencies
In your project's Python environment:
```bash
pip install -r requirements.txt
```

---

### 2. Python Integration (FastAPI / Flask / Django)

```python
from predictor import PayGuardPredictor

# Initialize once on server boot
detector = PayGuardPredictor(models_dir="models")

# Verify any incoming payment
result = detector.predict({
    "amount_inr": 2500.0,
    "old_balance_orig": 15000.0,
    "new_balance_orig": 12500.0,
    "old_balance_dest": 0.0,
    "new_balance_dest": 2500.0,
    "expected_merchant": "MERCH_STORE_44",
    "actual_beneficiary": "MERCH_STORE_44",
    "is_new_payee": 0,
    "payee_txn_count_30d": 14,
    "device_risk_signal": 0,
    "message_text": "Weekly grocery run"
})

print(result["status"])      # "APPROVED" | "DECLINED" | "FLAGGED_REVIEW"
print(result["is_fraud"])    # True | False
print(result["risk_score"])  # e.g. 0.0025
print(result["flags"])       # Warning flags (if any)
```

---

### 3. TypeScript Integration (Node.js / Express / Next.js / NestJS)

```typescript
import { checkTransactionFraud, TransactionInput } from './predictor';

const paymentData: TransactionInput = {
  amount_inr: 4500,
  old_balance_orig: 10000,
  new_balance_orig: 5500,
  expected_merchant: 'RETAIL_SHOP_1',
  actual_beneficiary: 'MULE_BEN_ACC99', // Mismatch!
  is_new_payee: 1,
  device_risk_signal: 1,
  message_text: 'Store order payment'
};

async function handlePayment() {
  const assessment = await checkTransactionFraud(paymentData);

  if (assessment.is_fraud) {
    console.warn(`Declined: ${assessment.flags.join(', ')}`);
    // Reject transaction or block transfer
  } else if (assessment.status === 'FLAGGED_REVIEW') {
    // Trigger Step-up OTP or 2FA verification
  } else {
    // Approve payment
  }
}
```

---

## 🎯 Response Format

```json
{
  "status": "DECLINED",
  "is_fraud": true,
  "risk_score": 0.768,
  "flags": [
    "BENEFICIARY_MISMATCH: Actual recipient differs from expected merchant (Possible QR scam).",
    "DEVICE_RISK: High-risk device paying an unfamiliar first-time recipient.",
    "STATISTICAL_ANOMALY: Behavioral profile strongly deviates from normal transactions."
  ],
  "breakdown": {
    "lightgbm_score": 0.8464,
    "random_forest_score": 0.9267,
    "graph_model_score": 0.3137,
    "anomaly_score": 0.2668,
    "is_anomaly": true
  }
}
```
