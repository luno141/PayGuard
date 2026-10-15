# 🚀 PayGuard Model Integration Guide

This guide explains how to connect the trained PayGuard models into your main project (FastAPI, Flask, Express/Node.js, or Next.js).

---

## 1. What Files You Need to Copy

To connect the models to your main project, copy **only these files/folders**:

```
your_main_project/
├── payguard/               <-- Copy this folder from here
│   ├── predictor.py        <-- Self-contained inference engine
│   └── models/             <-- Model artifacts and threshold configurations
│       ├── supervised_lgbm.joblib
│       ├── supervised_rf.joblib
│       ├── isolation_forest.joblib
│       ├── graph_logreg.joblib
│       ├── graph_scaler.joblib
│       ├── thresholds.json
│       └── feature_names.json
```

*(You do NOT need `data/`, `reports/`, or virtual environments in your main project).*

---

## 2. Dependencies

Install the lightweight runtime dependencies in your main project's Python environment:

```bash
pip install scikit-learn lightgbm joblib numpy
```

---

## 3. Python Integration (FastAPI / Flask / Django)

Import `PayGuardPredictor` and pass your incoming transaction dictionary:

```python
from payguard.predictor import PayGuardPredictor

# Initialize once when your server starts (loads models into memory)
detector = PayGuardPredictor(models_dir="payguard/models")

@app.post("/api/verify-payment")
def verify_payment(txn: dict):
    # txn should contain UPI/transaction fields:
    # {
    #     "amount_inr": 2500.0,
    #     "old_balance_orig": 15000.0,
    #     "new_balance_orig": 12500.0,
    #     "expected_merchant": "MERCH_AMAZON",
    #     "actual_beneficiary": "MERCH_AMAZON",
    #     "is_new_payee": 0,
    #     "payee_txn_count_30d": 12,
    #     "device_risk_signal": 0,
    #     "message_text": "Shopping order"
    # }
    result = detector.predict(txn)
    
    # Returns:
    # {
    #     "status": "APPROVED" | "DECLINED" | "FLAGGED_REVIEW",
    #     "is_fraud": False,
    #     "risk_score": 0.0025,
    #     "flags": [],
    #     "breakdown": {
    #         "lightgbm_score": 0.0003,
    #         "random_forest_score": 0.0067,
    #         "graph_model_score": 0.0002,
    #         "anomaly_score": -0.123,
    #         "is_anomaly": False
    #     }
    # }
    return result
```

---

## 4. Node.js / Express / Next.js Integration

If your main project is in JavaScript/TypeScript, you can call `predictor.py` via child process:

```javascript
const { execFile } = require('child_process');

function checkFraud(transactionData) {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(transactionData);
    execFile('python3', ['payguard/predictor.py', jsonStr], (error, stdout, stderr) => {
      if (error) {
        return reject(stderr || error);
      }
      resolve(JSON.parse(stdout));
    });
  });
}

// Usage in an Express route:
app.post('/api/pay', async (req, res) => {
  const assessment = await checkFraud(req.body);
  if (assessment.is_fraud) {
    return res.status(403).json({ error: "Transaction declined by PayGuard", ...assessment });
  }
  res.json({ message: "Transaction safe", assessment });
});
```

---

## 5. Decision Logic Summary

* **`status: "APPROVED"`** — Safe transaction, low risk score (< 0.15).
* **`status: "FLAGGED_REVIEW"`** — Low supervised fraud probability, but unusual pattern (IsolationForest anomaly flagged for step-up 2FA / OTP verification).
* **`status: "DECLINED"`** — High confidence fraud (triggered LightGBM / RF / Graph model or mismatch flag).
