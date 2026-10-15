# 02. Solution Design

## 1. High-level architecture
```
 Synthetic Data Generator ──► Feature Pipeline ──► Models (LightGBM + IsolationForest)
                                      │                         │
 Payment App (React /pay) ──► FastAPI /score ──► Context Analyzer ──► Risk Engine ──► Explainer (SHAP→text)
                                      │                                   │
                                      ▼                                   ▼
                               Event store (SQLite) ◄───── /feedback ◄── Analyst Dashboard (React /analyst)
                                      │
                                      └──► Retrain job (incremental) ──► model registry (versioned)
```

### Components
1. **Data generator** (`/data`): simulates users, payees, devices, and transactions plus scenario injectors.
2. **Feature pipeline** (`/ml/features.py`): same code path for training and serving (avoids train/serve skew).
3. **Context analyzer** (`/ml/context.py`): interprets the *request*: type (PAY / COLLECT / QR / LINK), narration text, merchant-name vs VPA mismatch, QR tamper hints, link risk stub.
4. **Models** (`/ml`): supervised LightGBM (known fraud) + Isolation Forest (novelty) → calibrated ensemble.
5. **Risk engine** (`/api/risk.py`): combines score + hard-rule signals → decision `ALLOW | WARN | HIGH_RISK_BLOCK_CONFIRM`.
6. **Explainer** (`/ml/explain.py`): SHAP top drivers + rule hits → templated plain language + scenario label.
7. **API** (`/api`): FastAPI: `/score`, `/feedback`, `/stats`, `/transactions`, `/retrain`.
8. **UI** (`/web`): `/pay` phone mock with warning screen; `/analyst` dashboard.

## 2. Fraud scenarios (India-specific)
| ID | Scenario | How it works | Key detection signals |
|---|---|---|---|
| S1 | **Collect-request "refund"** | Scammer says "I'll refund you", sends a *collect* request; victim approves and money leaves | Request type = COLLECT, narration contains refund/cashback/prize, direction = debit, unknown payer-initiator, new payee |
| S2 | **QR swap / tampered QR** | Merchant's QR replaced with fraudster's | QR payee VPA ≠ displayed merchant name, VPA handle unusual for merchant category, first-time payee at known merchant location |
| S3 | **Screen-share / remote-access scam** | Victim is guided via AnyDesk/TeamViewer-type app | Remote-access app active flag, active call during payment, rapid repeated attempts, new device/session, unusually large amount |
| S4 | **Fake KYC / bank alert link** | SMS "KYC expiring, click here" leads to pay page | link_risk high, payment initiated from link, narration mismatch, new payee |
| S5 | **Fake customer-care / refund** | Victim googles a fake helpline number and is told to "verify" by paying | Payee VPA resembles brand but isn't verified, call-in-progress, small "test" payment followed by large one |
| S6 | **Mule-account chain** | Victim funds land in mule accounts that forward quickly | Payee graph: high fan-in, new account, fast pass-through (in → out within minutes), many distinct senders |
| S7 *(held out)* | **Unseen: fake job / registration-fee or parking-QR scam** | Used ONLY for the adaptivity demo; never in initial training | Detected via anomaly score, then learned through feedback |

## 3. Feature groups
**Transaction**: amount, amount/user-median ratio, amount z-score, hour-of-day, is-night, day-of-week, txns in last 10 min / 1 h / 24 h (velocity), balance-drain ratio.
**Payee**: is_new_payee, payee_age_days, payee_distinct_senders_24h (fan-in), payee_fanout_ratio, payee_prior_reports, vpa_handle_risk, vpa_brand_similarity (edit distance to known brands).
**Context**: request_type one-hot (PAY / COLLECT / QR / LINK), narration_flags (refund, cashback, KYC, prize, lottery, urgent), direction_mismatch (user expects to receive but is paying), merchant_name_vs_vpa_mismatch, qr_source, link_risk (stub 0-1).
**Device/behaviour**: new_device, sim_changed_recently, remote_access_app_active, screen_share_active, call_in_progress, session_duration, failed_attempts, time_to_confirm (seconds; very short = rushed, very long = coached), typing_pattern_anomaly (optional, simulated).

## 4. Modelling approach
- **Supervised**: LightGBM, `scale_pos_weight`, early stopping, temporal train/val/test split. Calibrate with isotonic regression.
- **Unsupervised**: Isolation Forest trained on *legitimate-only* behaviour per feature set → novelty score; catches things the classifier never saw.
- **Ensemble**: `risk = 0.7 * p_supervised + 0.3 * anomaly_norm`, then rule overrides (e.g., COLLECT + "refund" + debit ⇒ min risk floor). Weights tuned on validation set.
- **Decision thresholds** (tuned on validation to hit target FPR ≤ 1-2%):
  - `< T1` ALLOW
  - `T1 ≤ r < T2` WARN (dismissible banner)
  - `≥ T2` HIGH-RISK (full-screen warning + "Are you sure? Cooling-off 10 s" + suggest calling bank)
- Why hybrid? Supervised = precision on known scams; anomaly = recall on new ones; rules = guaranteed behaviour for the clearest India-specific patterns and easy explainability.

## 5. Explainability
1. Compute SHAP values for the LightGBM prediction; take top-3 positive contributors.
2. Map each feature to a **human sentence template**, e.g.:
   - `request_type=COLLECT & direction_mismatch` → "This is a request for you to PAY ₹5,000. You will not receive money."
   - `merchant_name_vs_vpa_mismatch` → "The QR says 'Sharma Sweets' but the payee ID belongs to a different name."
   - `remote_access_app_active` → "A screen-sharing app is running. Banks never ask you to share your screen."
   - `payee_distinct_senders_24h` high → "This account received money from 38 different people in the last hour."
3. UI shows: a headline reason, 2-3 supporting bullets, a risk meter, and the scam type label.
4. Analyst view additionally shows the SHAP bar chart and raw features.

## 6. Adaptivity (unseen fraud) demo flow
1. Train on S1-S6 only. Evaluate. Record metrics.
2. Inject S7 transactions. Show: supervised model recall on S7 is low; **anomaly score still elevates** many of them → flagged as "Unusual pattern, unknown type".
3. Analyst opens the dashboard, sees the "Novel/Unknown" cluster, labels a handful as fraud (`/feedback`).
4. Click **Retrain** (incremental: warm-start LightGBM with new labelled samples + upweight; refit IF baseline). New model version `v2`.
5. Re-evaluate on S7 hold-out: recall rises; overall FPR is unchanged or better. Show before/after chart + drift indicator (PSI on key features).

## 7. Integration story (practicality)
- Single REST call `POST /score` with transaction + context + device signals → returns `{risk, decision, scenario, reasons[], latency_ms}`.
- Designed as a **pre-authorization hook** inside any PSP/UPI app: call before showing the PIN screen.
- Stateless scoring, features precomputed from a lightweight profile store (SQLite now; Redis in production).
- p95 latency target < 100 ms on CPU.
- Privacy: only derived features leave the device where possible; no PII needed in the model.
