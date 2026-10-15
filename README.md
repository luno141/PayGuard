# PayGuard: Detection of Creative Payment Frauds (CC6-AI02)

Real-time, explainable fraud prevention for UPI-style payments. It scores a transaction **together with its payment context** (collect request, QR, link, narration) and **behaviour** (device, call/screen-share signals), and warns the user *before* they pay.

## Approved detection workflow
PayGuard uses a reproducible, seeded **synthetic UPI dataset** because no
appropriate labelled UPI dataset is publicly available. It never connects to a
live payment rail or uses real customer data.

Three separate models contribute evidence to one transparent risk decision:

1. **Transaction-risk classifier** — a supervised scikit-learn classifier for
   known fake-refund, QR-beneficiary-mismatch, and mule-payment patterns.
2. **Novelty detector** — Isolation Forest, trained only on legitimate training
   records, for previously unseen unusual behaviour.
3. **Account-network classifier** — a separate model trained on NetworkX-derived
   account-flow features to identify suspected mule accounts.

Context rules remain a safety and explanation layer: they identify an outgoing
collect request disguised as a refund and a known merchant whose QR resolves to
a different beneficiary. They are not treated as a fourth model.

The risk engine combines calibrated model outputs and rule evidence using
validation-only thresholds. `label` and `scenario` are evaluation metadata and
are never model inputs.

## Model-team hand-off
The API is ready for the ML pipeline. Implement
`ml.serving.score_models(record)` using the exact input/output contract in
[`ml/SERVING_CONTRACT.md`](ml/SERVING_CONTRACT.md). Until artifacts are
available, refund and QR mismatch safety rules still operate, and responses
explicitly report `MODEL_UNAVAILABLE` rather than inventing a model score.

## Run locally
```bash
# terminal 1
make api

# terminal 2
make ui
```

Open `http://localhost:5173/pay` for the payment simulator and
`http://localhost:5173/analyst` for the analyst dashboard. The frontend uses
`VITE_API_URL` (default `http://localhost:8000`); copy `.env.example` to a
frontend environment file only if the API runs elsewhere.

## Doc map
| File | Purpose |
|---|---|
| `docs/01_PROBLEM_ANALYSIS.md` | Problem statement decoded, requirement checklist, scoring strategy |
| `docs/02_SOLUTION_DESIGN.md` | Architecture, features, models, scenarios, adaptivity, explainability |
| `docs/03_PRD.md` | Product Requirements Document |
| `docs/04_DATA_AND_EVALUATION.md` | Synthetic data spec, labelling, metrics, test protocol |
| `docs/05_BUILD_PLAN.md` | Phased plan, task checklist, team split, demo script |
| `AGENTS.md` | Standing rules for the coding agent (Codex / Antigravity) |

## Quick start (target state)
```bash
make setup      # install deps
make data       # generate synthetic dataset
make train      # train models + write metrics report
make api        # FastAPI on :8000
make ui         # React app on :5173 (/pay and /analyst)
make demo       # seeds scenarios for the live demo
```
