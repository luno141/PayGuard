# AGENTS.md: Standing rules for the coding agent

## Project
PayGuard: real-time, explainable detection of creative UPI payment frauds (hackathon problem CC6-AI03). Read `docs/01`-`docs/05` before coding. `docs/03_PRD.md` is the source of truth for requirements.

## Hard constraints
- Use **synthetic or public data only**. Never include real customer data. No live payment systems or real bank/UPI APIs.
- Do **not** build a full phishing classifier (out of scope, CC6-AI05). Use a simple `link_risk` stub/heuristic.
- `label` and `scenario` columns must **never** be model features.
- The same feature code must be used for training and serving.
- All randomness seeded (default seed 42). `make data train` must reproduce reported metrics.
- Never tune thresholds on the test set. Use temporal splits.

## Engineering rules
- Python 3.11, type hints, Pydantic schemas, ruff-clean.
- Small, composable modules; no giant files. Write tests (pytest) for generator determinism, API schema, leakage, latency.
- Work in phases. After each phase: run tests, run the relevant make target, summarise results, and update `docs/05_BUILD_PLAN.md` checkboxes.
- Prefer the simplest thing that works; ship a vertical slice first (S1 end-to-end), then widen.
- Do not add heavy dependencies without need. Keep install under ~5 minutes.
- Every WARN/HIGH decision must return at least one human-readable reason.
- Report real measured metrics. Never fabricate numbers.

## Definition of done
All P0 requirements in the PRD met; `reports/metrics.md` generated; both UI routes working; 6 scenarios + 2 legit flows demoable; README accurate.
