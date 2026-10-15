# 01. Problem Analysis

## 1. The problem in plain words
UPI fraud is rarely "stolen card used abroad". It is **social engineering**: the victim is tricked into approving the payment themselves. Because the user is the one tapping "Pay", classic rules (amount thresholds, blacklists) fail. The tell-tale signs are in the **context** (what led to the payment, who is asking, what the screen says) and **behaviour** (on a call, screen-sharing, rushed, new payee), not just the amount.

Two gaps to close:
1. **Detection gap**: static rules miss evolving, creative scams.
2. **Warning gap**: the user gets no clear, human-readable warning at the moment of paying.

## 2. Objective (restated)
Build an AI system that, **before or during** a transaction, analyses (a) the transaction, (b) the message/link/QR/collect request that led to it, (c) surrounding behaviour, then **warns the user with a clear explanation** and gives analysts a view of what is happening.

## 3. Requirement checklist (maps 1:1 to the problem statement)
| # | Requirement | How we satisfy it | Evidence in demo |
|---|---|---|---|
| R1 | Transaction risk scoring (ML/anomaly) using amount, timing, payee history, device, behaviour | LightGBM classifier + Isolation Forest, ensembled into a 0-100 risk score | Score + feature table per txn |
| R2 | Payment-context analysis: links, QR, collect requests; mismatched merchant, new payee, "refund" wording on a debit | Context feature extractor and rule-signals feeding the model | Context panel on warning screen |
| R3 | ≥3 India-specific scams | We implement **6**: collect-request refund, QR swap, screen-share/remote-access, fake KYC/bank-alert link, fake customer-care/refund, mule-account chain | End-to-end scenario buttons |
| R4 | Real-time warning with clear reason | Warning screen, e.g. "You are about to PAY ₹5,000, not receive" | Phone-mock UI |
| R5 | Explainability | SHAP top-k drivers → plain-language templates, in English (+ Hindi optional) | "Why flagged" section |
| R6 | Adaptivity to unseen fraud | Hold-out scenario + anomaly detector + analyst feedback → incremental retrain | Before/after metrics chart |
| R7 | Dashboard | Analyst dashboard: flagged txns, categories, trends, feedback buttons | `/analyst` page |

## 4. Deliverables checklist (from the statement)
- [ ] Prototype with a model trained on public or synthetic data
- [ ] ≥3 fraud scenarios demonstrated end to end
- [ ] Measured **precision, recall, false-positive rate** on a labelled test set **including legitimate examples**
- [ ] User-facing warning screen
- [ ] Analyst dashboard

## 5. Success criteria and how to win each
| Judging criterion | Our play |
|---|---|
| Accuracy with low false positives | Hard-negative legitimate cases (genuine refunds, new-but-legit payees, big rent payments); threshold tuned to FPR target; report FPR prominently |
| Coverage of creative/new fraud types | 6 scenarios + a 7th held-out "unseen" scenario for the adaptivity demo |
| Quality of explanations | SHAP + human templates; never show raw feature names to users |
| Speed and practicality of integration | `/score` REST API, p95 latency < 100 ms, SDK-style payload, documented integration points (PSP app pre-pay hook) |

## 6. Scope and constraints
- Synthetic/public data only; no real customer data; no live payment systems.
- **Phishing detection is covered by another problem (CC6-AI05)**. Do **not** build a full phishing classifier. Consume a `link_risk` signal via a simple stub/heuristic and say so explicitly.
- Be honest about synthetic-data limits in the final presentation. Judges respect this.

## 7. Key risks
| Risk | Mitigation |
|---|---|
| Synthetic data too easy, so ~100% accuracy looks fake | Add noise, class overlap, hard negatives, temporal split; report honestly |
| Too much scope | Build vertical slice first (1 scenario end-to-end), then widen |
| Black-box feel | Explanation is a first-class UI element |
| Imbalanced data | Stratified/temporal split, class weights, PR-AUC, threshold tuning |
