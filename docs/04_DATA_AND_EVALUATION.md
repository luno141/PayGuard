# 04. Data and Evaluation

## 1. Synthetic data generator spec
Seeded (`--seed 42`), configurable size (default 200k transactions, 90 simulated days).

### Entities
- **Users** (~5,000): profile = median amount, active hours, usual payees (5-30), device id, home city, balance.
- **Merchants** (~300): category, verified VPA, display name.
- **Payees (P2P)**: individuals with VPA, account age.
- **Mule accounts** (~100): young accounts with burst in/out patterns.

### Legitimate traffic (≈97-99%)
Mix of: P2P to known contacts, merchant QR payments, bill payments, rent/EMI (large but regular), first-time legit payees (friends, new shops), **legitimate collect requests** (utility, subscription), **genuine refunds** (credit direction), night-time legitimate payments, high-value legit purchases. These are the **hard negatives**, so FPR is meaningful.

### Fraud scenarios injected (≈1-3%)
Implement one injector function per scenario (S1-S6, plus S7 for hold-out). Each sets context/device/payee/behaviour distributions per `02_SOLUTION_DESIGN.md`. **Add overlap**: ~10-15% of fraud rows should look partially normal (e.g., known device, daytime) and ~2-3% of legit rows should share a suspicious signal (e.g., new payee + large amount) so the model is not trivially perfect.

### Output schema (`data/transactions.parquet`)
`txn_id, user_id, timestamp, amount, direction, payee_vpa, payee_display_name, payee_age_days, is_new_payee, payee_distinct_senders_24h, request_type, narration, qr_merchant_name, qr_vpa_name_match, link_risk, new_device, sim_changed, remote_access_app_active, screen_share_active, call_in_progress, session_duration_s, time_to_confirm_s, failed_attempts, txns_last_10m, txns_last_1h, amount_to_median_ratio, label, scenario`
(`label` ∈ {0,1}; `scenario` ∈ {legit, S1..S7} used for per-scenario evaluation only, never as a feature.)

### Optional public data
PaySim, IEEE-CIS Fraud, Kaggle credit-card fraud, or Kaggle UPI-style synthetic sets can be blended for amount/velocity realism. Check licences, cite them, and do not claim they contain India-specific scams. Keep **context fields synthetic**.

## 2. Splitting protocol
- **Temporal split**: days 1-60 train, 61-75 validation, 76-90 test (prevents leakage and mimics deployment).
- S7 is **absent from train/val**; appears in a separate `s7_holdout` set plus a feedback pool.
- Fit scalers/encoders on train only.
- Never tune thresholds on test.

## 3. Metrics
Compute at the operating threshold(s) chosen on validation:
- Confusion matrix; **Precision, Recall, F1, FPR** (FPR = FP / (FP + TN))
- **PR-AUC** (primary threshold-free metric given imbalance), ROC-AUC (secondary)
- **Per-scenario recall** (S1-S6) and S7 before/after feedback
- **Alert rate** (% of all txns flagged) and "legit friction rate"
- ₹ value protected vs ₹ value of legit txns warned
- **Latency**: p50/p95 over 10k scoring calls
- **Calibration** curve (optional)

Output to `reports/metrics.json` and `reports/metrics.md` (table + plots: PR curve, confusion matrix, per-scenario recall bar, SHAP summary, before/after adaptivity).

## 4. Baselines to show
1. Static rules only (amount > ₹X, night, new payee)
2. Isolation Forest only
3. LightGBM only
4. **Full hybrid (ours)**

A comparison table showing the hybrid beating a static-rule baseline is strong evidence for judges.

## 5. Evaluation checks / sanity
- Shuffle-label test: performance should collapse to chance.
- Feature leakage audit: ensure `scenario`, `label`, and generator-only fields aren't features.
- Ablation: remove context features and show the drop (proves context analysis matters).
- Report confidence intervals via bootstrap if time permits.

## 6. Honest-reporting note (include in slides)
"Results are on synthetic data and demonstrate the method, not production performance. Real deployment requires validation on real, privacy-preserving data and continuous monitoring."
