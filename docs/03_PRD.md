# 03. Product Requirements Document (PRD)

**Product**: PayGuard
**Problem ID**: CC6-AI03, AI Detection of Creative Payment Frauds
**Version**: 1.0 (hackathon prototype)
**Status**: Draft

## 1. Overview
PayGuard is a real-time fraud-prevention layer for UPI-style payment apps. It scores each payment using transaction, context, and behavioural signals, shows the user a clear warning before they pay, and gives bank analysts a dashboard to monitor and teach the system.

## 2. Goals and non-goals
**Goals**
- G1: Detect creative, socially-engineered payment frauds before money moves.
- G2: Keep false positives low so honest users are not annoyed.
- G3: Explain every decision in plain language.
- G4: Adapt to new fraud patterns with analyst feedback.
- G5: Be easy to integrate (single API call).

**Non-goals**
- Real customer data, live payment rails, real bank integration.
- Full phishing/URL classification (CC6-AI05 scope; we use a stub signal).
- Production-grade security, auth, and compliance (documented as future work).

## 3. Personas
| Persona | Need | Success looks like |
|---|---|---|
| **Asha, everyday UPI user** (non-technical, 45) | Know when something is wrong, in simple words | Reads a 1-line warning and cancels a scam payment |
| **Rohit, merchant** | Not be blocked on legit payments | Legit QR payments pass without friction |
| **Meera, bank fraud analyst** | See trends, triage alerts, teach the system | Labels alerts in seconds; sees model improve |
| **Judge/Evaluator** | Verify measurable results | Sees precision/recall/FPR and live demo |

## 4. User stories
- US1: As a user, when a *collect* request is disguised as a refund, I see "You are about to PAY ₹X, not receive" before entering my PIN.
- US2: As a user, if the QR's merchant name doesn't match the payee ID, I'm warned.
- US3: As a user, if a screen-share app is active during payment, I get a high-risk warning and a cooling-off.
- US4: As a user, I can dismiss a low/medium warning and proceed (human stays in control).
- US5: As an analyst, I see flagged transactions, categories, and trends over time.
- US6: As an analyst, I can mark an alert as Fraud / Legit, and trigger a retrain.
- US7: As an analyst, I can see *why* each transaction was flagged.
- US8: As a developer, I can call one endpoint and get a decision and reasons.

## 5. Functional requirements
| ID | Requirement | Priority |
|---|---|---|
| FR1 | `POST /score` returns risk (0-100), decision, scenario label, ≥1 reason, model version, latency | P0 |
| FR2 | Supervised model (LightGBM) trained on synthetic data covering ≥3 (target 6) scenarios | P0 |
| FR3 | Anomaly model (Isolation Forest) gives novelty score | P0 |
| FR4 | Context analyzer: request type, narration flags, merchant/VPA mismatch, new payee, link risk stub | P0 |
| FR5 | Explanations: SHAP top-3 mapped to plain-language templates | P0 |
| FR6 | User warning screen (three levels: none/warn/high-risk) with reason and Cancel/Proceed | P0 |
| FR7 | Scenario simulator buttons in `/pay` to trigger each fraud + legit flows | P0 |
| FR8 | Analyst dashboard: KPIs, flagged list, category breakdown, time-series trend | P0 |
| FR9 | Metrics report: precision, recall, F1, FPR, PR-AUC, confusion matrix, per-scenario recall | P0 |
| FR10 | `/feedback` endpoint + UI buttons to label alerts | P1 |
| FR11 | `/retrain` incremental learning with before/after metrics and model versioning | P1 |
| FR12 | Unseen-scenario hold-out demo (S7) | P1 |
| FR13 | Drift indicator (PSI) | P2 |
| FR14 | Hindi warning text toggle | P2 |
| FR15 | Mule-chain graph visualisation on dashboard | P2 |

## 6. Non-functional requirements
- **Latency**: p95 `/score` < 100 ms (CPU, single instance).
- **Reproducibility**: fixed random seeds; `make data train` reproduces reported metrics.
- **Explainability**: 100% of WARN/HIGH decisions carry ≥1 human-readable reason.
- **Privacy**: no real PII; synthetic identifiers only.
- **Usability**: warning readable in ≤ 5 seconds; max 25 words headline+reason.
- **Observability**: structured logs for each decision.

## 7. Success metrics (targets on held-out labelled test set with legitimate traffic)
| Metric | Target |
|---|---|
| Recall (known scenarios) | ≥ 90% |
| Precision | ≥ 85% |
| False-positive rate | ≤ 1-2% |
| Recall on unseen S7 *before* feedback | report honestly (expect modest, anomaly-driven) |
| Recall on S7 *after* feedback | ≥ 80% |
| p95 latency | < 100 ms |
| Explanation coverage | 100% of flagged txns |

> Report whatever you actually measure. Do not tune on the test set.

## 8. UX specification
**Warning screen (`/pay`)**
- Level 1 WARN (amber banner): icon, headline ("Check before you pay"), reason line, [Cancel] [Continue].
- Level 2 HIGH (red full-screen): headline ("Likely scam: you are about to PAY ₹5,000, not receive"), 2-3 bullets, risk meter, 10-sec cooling-off on Continue, [Cancel & report] primary.
- Always show scam type chip (e.g., "Fake refund request").

**Analyst dashboard (`/analyst`)**
- KPI cards: txns scored, flagged %, estimated ₹ prevented, FPR on labelled feedback.
- Charts: fraud category donut/bar, flagged-over-time line, risk-score histogram.
- Table: flagged transactions with risk, scenario, top reasons, status, [Fraud]/[Legit] buttons.
- Panel: model version, "Retrain with feedback" button, before/after metrics.

## 9. API contract (v1)
**POST /score**
```json
{
  "txn_id": "T123", "user_id": "U1", "timestamp": "2026-10-15T21:40:00+05:30",
  "amount": 5000, "direction": "DEBIT",
  "payee": {"vpa": "refund.help@oksbi", "display_name": "Refund Desk", "first_seen": true, "age_days": 2},
  "context": {"request_type": "COLLECT", "narration": "Refund of Rs 5000", "qr_merchant_name": null, "link_risk": 0.1},
  "device": {"new_device": false, "remote_access_app_active": true, "call_in_progress": true, "time_to_confirm_s": 6}
}
```
**Response**
```json
{
  "txn_id": "T123", "risk": 93, "decision": "HIGH_RISK",
  "scenario": "collect_refund_scam",
  "headline": "You are about to PAY ₹5,000, not receive.",
  "reasons": ["This is a collect request: money will leave your account.", "Payee was created 2 days ago.", "A screen-sharing app is running."],
  "explain": {"shap_top": [["request_type_COLLECT", 0.42], ["remote_access_app_active", 0.31]]},
  "model_version": "v1", "latency_ms": 18
}
```
Other endpoints: `POST /feedback {txn_id, label}`, `POST /retrain`, `GET /stats`, `GET /transactions?flagged=true`, `GET /metrics`.

## 10. Milestones
M1 data + baseline model; M2 API + context + explanations; M3 UI warning; M4 dashboard; M5 adaptivity + metrics; M6 polish + demo. See `05_BUILD_PLAN.md`.

## 11. Risks and open questions
- Synthetic realism → document assumptions, add noise/hard negatives.
- Cooling-off UX may annoy users → only on HIGH risk.
- Which public dataset (if any) to blend in → optional; PaySim/IEEE-CIS style data can enrich amount/velocity distributions (check licences).

## 12. Future work
Federated/on-device scoring, real PSP SDK, graph neural network for mule rings, voice-call scam signals, multilingual warnings, regulator reporting.
