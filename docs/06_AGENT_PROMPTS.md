# 06. Prompts for Codex / Antigravity

**How to use**
1. Create the repo, copy this folder in (`docs/`, `AGENTS.md`, `README.md`).
2. Paste the **Master Prompt** first. It makes the agent read the docs, plan, and start Phase 0-1.
3. Then paste the **Phase Prompts** one by one, after verifying each phase works.
4. If the agent drifts, paste the **Course-correction prompt**.

---

## MASTER PROMPT (paste first)

```
You are a senior ML + full-stack engineer building a hackathon prototype called "PayGuard" for problem CC6-AI03: "AI Detection of Creative Payment Frauds".

FIRST: read AGENTS.md and every file in /docs (01_PROBLEM_ANALYSIS, 02_SOLUTION_DESIGN, 03_PRD, 04_DATA_AND_EVALUATION, 05_BUILD_PLAN). Treat 03_PRD.md as the source of truth. Then reply with (a) a 10-line summary of what you will build, (b) any assumptions or questions (max 5), and (c) your plan for Phase 0 and Phase 1. Then proceed without waiting unless a question blocks you.

PROBLEM SUMMARY
UPI fraud in India is social engineering: victims approve payments themselves. Static rules miss creative scams. Build an AI system that, before/during a transaction, analyses (1) transaction features, (2) payment context (collect request, QR, link, narration, merchant-name vs payee mismatch), and (3) behaviour/device signals, then warns the user with a clear explanation, and gives analysts a dashboard.

MUST DELIVER
1. Transaction risk scoring: LightGBM (supervised) + Isolation Forest (anomaly) ensembled to a 0-100 risk score, thresholds tuned to a target false-positive rate (<= 1-2%).
2. Payment-context analysis: request type (PAY/COLLECT/QR/LINK), narration flags (refund/cashback/KYC/prize), merchant/VPA mismatch, new payee, link_risk stub.
3. At least 3 (target 6) India-specific scams: S1 collect-request refund, S2 QR swap, S3 screen-share/remote-access, S4 fake KYC/bank link, S5 fake customer-care/refund, S6 mule-account chain. Plus S7 (held-out unseen scam, e.g., fake job registration-fee) used ONLY for the adaptivity demo.
4. Real-time warning: user-facing screen with 3 levels, plain-language reason such as "You are about to PAY ₹5,000, not receive."
5. Explainability: SHAP top drivers mapped to plain-language templates; analyst view shows SHAP bars.
6. Adaptivity: show an unseen scam, analyst feedback via /feedback, incremental /retrain, before/after metrics, model versioning (v1 to v2), optional PSI drift indicator.
7. Analyst dashboard: KPIs, flagged transactions table, fraud categories, trends, feedback buttons.
8. Evaluation: measured precision, recall, F1, FPR, PR-AUC, per-scenario recall on a labelled temporal test set that INCLUDES hard-negative legitimate transactions (genuine refunds, legit collect requests, new-but-legit payees, big rent/EMI payments). Include baselines (static rules, IF only, LightGBM only, hybrid) and an ablation without context features. Write reports/metrics.json and reports/metrics.md with plots.

CONSTRAINTS
- Synthetic/public data only. No real customer data, no live payment systems. Do not build a full phishing classifier (CC6-AI05); use a link_risk stub.
- label/scenario are never features. Same feature code for train and serve. Seeded and reproducible. Temporal split. Never tune on test. Report only real measured numbers.
- Add realistic noise/overlap so results are not trivially perfect.

STACK
Python 3.11, pandas, numpy, scikit-learn, LightGBM, SHAP, FastAPI, Pydantic, SQLite, pytest, ruff. Frontend: React + Vite + TypeScript + Tailwind + Recharts with routes /pay (phone-mock warning UI with scenario buttons) and /analyst (dashboard). Provide a Makefile with: setup, data, train, api, ui, demo, test.

API (see PRD section 9): POST /score, POST /feedback, POST /retrain, GET /stats, GET /transactions, GET /metrics. /score p95 latency < 100 ms.

WORKING STYLE
Work in the phases in docs/05_BUILD_PLAN.md. Build a vertical slice first (S1 end-to-end: data to model to API to warning UI), then widen. After each phase: run tests and the make target, show results, tick the checklist. Be concise; don't paste whole files in chat. Start now with Phase 0 and Phase 1.
```

---

## PHASE PROMPTS

### Phase 1: Data generator
```
Implement Phase 1 per docs/04_DATA_AND_EVALUATION.md. Create data/generator.py and data/scenarios.py producing data/transactions.parquet (default 200k rows, 90 days, seed 42, CLI flags --n --seed --out). Include users, merchants, mule accounts, a realistic legit mix with HARD NEGATIVES (genuine refunds, legit collect requests, new-but-legit payees, large rent/EMI, night legit payments), and injectors for S1-S6 plus S7 (S7 written to a separate file data/s7_holdout.parquet and never in the main train data). Add overlap/noise (10-15% of fraud looks partly normal; 2-3% of legit shares a suspicious signal). Add `make data`. Write pytest tests: determinism for fixed seed, class ratio 1-3% fraud, no NaN in required columns, scenario column present. Print a summary table of counts per scenario.
```

### Phase 2: Features and models
```
Implement Phase 2. Build ml/features.py (shared by train and serve), ml/context.py (request type, narration flags via keyword/regex, merchant-name vs VPA mismatch using fuzzy matching, new payee, link_risk passthrough), ml/train.py (temporal split 60/15/15 days, LightGBM with class weighting + isotonic calibration, Isolation Forest fit on legit-only train rows, ensemble risk = 0.7*p + 0.3*anomaly_norm with tuned weights, thresholds T1/T2 chosen on validation to hit FPR <= 1.5%) and ml/evaluate.py (precision, recall, F1, FPR, PR-AUC, ROC-AUC, confusion matrix, per-scenario recall, alert rate, baselines: static rules / IF only / LGBM only / hybrid, ablation without context features, shuffle-label sanity test). Save models to models/v1/, and reports/metrics.json + reports/metrics.md + figures. Add tests that label/scenario aren't features. Report real numbers.
```

### Phase 3: API + explainer
```
Implement Phase 3. Create api/main.py (FastAPI), api/schemas.py (Pydantic per PRD section 9), api/risk.py (ensemble + rule floors, decision ALLOW/WARN/HIGH_RISK), api/store.py (SQLite persistence of scored txns and feedback), ml/explain.py (SHAP top-3 mapped to plain-language templates, English with optional Hindi; scenario label inference from rule hits + top features). Endpoints: POST /score, POST /feedback, POST /retrain (stub for now), GET /stats, GET /transactions, GET /metrics. Load models once at startup. Add a script scripts/bench_latency.py measuring p50/p95 over 10k calls and a pytest for schema validity and "every WARN/HIGH has >=1 reason". Add `make api`.
```

### Phase 4: Warning UI
```
Implement Phase 4 in /web (Vite + React + TS + Tailwind). Route /pay renders a phone-mock UPI app with: a scenario selector (S1 collect-refund, S2 QR swap, S3 screen-share, S4 fake KYC link, S5 fake customer care, S6 mule payee, plus legit: genuine refund, rent payment, new friend), a pay-confirmation screen that calls POST /score BEFORE the PIN screen, and a 3-level warning UI: none / amber WARN banner / red HIGH_RISK full-screen with headline reason, 2-3 bullets, risk meter, scam-type chip, 10-second cooling-off on Continue and a primary "Cancel and report". The user can always proceed on WARN. Keep text <= 25 words for headline+reason. Add `make ui`. Polished, mobile-first, accessible contrast.
```

### Phase 5: Analyst dashboard
```
Implement Phase 5: route /analyst with KPI cards (txns scored, flagged %, est. Rs prevented, FPR on labelled feedback), charts (fraud category bar/donut, flagged-over-time line, risk-score histogram) using Recharts, a flagged-transactions table (risk, scenario, top reasons, status) with [Fraud]/[Legit] buttons calling /feedback, a detail drawer showing SHAP bars + raw features, and a model panel (version, metrics, Retrain button). Auto-refresh every 5s. Add `make demo` that seeds the API with a stream of mixed legit and fraud transactions so the dashboard is lively.
```

### Phase 6: Adaptivity
```
Implement Phase 6. (1) Ensure S7 (unseen scam) is excluded from v1 training. (2) Show that v1 supervised recall on S7 is low while the anomaly score elevates it, labelled "Unusual pattern: unknown type" in UI. (3) Implement POST /retrain: take analyst-labelled feedback (from the DB) plus S7 samples from the feedback pool, warm-start/refit LightGBM with upweighted new samples, refit IF baseline, evaluate on the original test set (no regression in FPR) and on S7 hold-out, save models/v2/, and return a before/after metrics diff. (4) Dashboard: before/after chart and model version switch. (5) Add PSI drift indicator for top features. (6) Write tests that v2 recall on S7 > v1 and FPR change <= +0.5pp. Document the demo steps in README.
```

### Phase 7: Polish
```
Phase 7: finalize. Update README (setup, architecture diagram in mermaid, results table from reports/metrics.md, demo steps, limitations incl. synthetic-data caveat and CC6-AI05 phishing scope note, future work). Add Dockerfile/docker-compose (optional). Ensure `make setup && make data train api ui demo` works from a clean clone. Run full test suite and ruff. Generate a one-page results summary at reports/summary.md with the real numbers. List any unmet PRD items honestly.
```

---

## COURSE-CORRECTION PROMPT
```
Stop and re-read AGENTS.md and docs/03_PRD.md. List which P0 requirements are done, partial, or missing, with evidence (file paths, test results, metric values). Fix gaps in priority order. Do not fabricate metrics; run the code and report actual outputs. Avoid scope creep: no phishing classifier, no real data.
```

## "MAKE IT DEMO-READY" PROMPT
```
Optimise for the live demo: ensure each of the 6 fraud scenarios and 3 legit flows is a one-click path in /pay with deterministic outcomes (seeded), the dashboard updates within 5 seconds, and the adaptivity flow (unseen scam to label to retrain to improved recall) completes in under 60 seconds. Add a /demo-reset endpoint and a README "Demo script" section matching docs/05_BUILD_PLAN.md.
```

## Tips for the agents
- **Codex**: run it in the repo root with `AGENTS.md` present; it picks it up automatically. Give one phase per task and ask it to run `make test` before finishing.
- **Antigravity**: use the Manager view to run Backend (Phases 1-3) and Frontend (Phases 4-5) agents in parallel *after* agreeing on the API contract in PRD §9. Review the artifacts and test output each agent produces before merging.
- Commit after every phase so you can roll back if the agent breaks something.
