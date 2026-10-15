# 05. Build Plan

## Recommended stack
- **Backend/ML**: Python 3.11, pandas, numpy, scikit-learn, LightGBM, SHAP, FastAPI, Uvicorn, Pydantic, SQLite (SQLModel/SQLAlchemy), joblib, pytest
- **Frontend**: React + Vite + TypeScript + Tailwind + Recharts (routes `/pay`, `/analyst`). *Fallback if short on time*: Streamlit for the dashboard + a single HTML warning page.
- **Tooling**: Makefile, ruff, `.env.example`, Docker Compose (optional)

## Repo layout
```
upiguard/
  AGENTS.md  README.md  Makefile  pyproject.toml
  data/           generator.py scenarios.py   (outputs gitignored)
  ml/             features.py context.py train.py evaluate.py explain.py adapt.py
  api/            main.py schemas.py risk.py store.py
  web/            (Vite React app: /pay, /analyst)
  reports/        metrics.json metrics.md figures/
  tests/
  docs/
```

## Phases (suggested ~24-36 h hackathon timeline)
| Phase | Hours | Output | Done when |
|---|---|---|---|
| 0. Setup | 1 | Repo, env, Makefile, docs in place | `make setup` works |
| 1. Data | 3 | Generator with S1-S6 (+S7), hard negatives | `make data` gives parquet with expected class ratios |
| 2. Features and models | 4 | Feature pipeline, LightGBM, IF, ensemble, thresholds | Metrics report generated |
| 3. API | 3 | `/score`, explanations, persistence | curl returns decision + reasons < 100 ms |
| 4. Warning UI | 4 | `/pay` phone mock + scenario buttons | All 6 scenarios + 2 legit flows demoable |
| 5. Dashboard | 4 | `/analyst` KPIs, charts, table, feedback | Live data flows from API |
| 6. Adaptivity | 3 | S7 demo, `/retrain`, before/after | Recall on S7 improves post-feedback |
| 7. Polish | 3 | README, slides, demo video, tests | Rehearsed 5-min demo |

## Task checklist
- [ ] Generator: users, merchants, mule accounts, legit mix, hard negatives
- [ ] Scenario injectors S1-S7 with overlap/noise
- [ ] Feature pipeline shared by train and serve
- [ ] Context analyzer (collect/refund, VPA-name mismatch, narration flags, link stub)
- [ ] LightGBM + calibration; Isolation Forest; ensemble; threshold tuning to FPR target
- [ ] Baselines + ablation + metrics report with plots
- [ ] SHAP to template explanations (EN, optional HI)
- [ ] FastAPI endpoints + SQLite store + model registry (v1, v2)
- [ ] Phone-mock warning UI with 3 levels + cooling-off
- [ ] Analyst dashboard + feedback + retrain button + before/after chart
- [ ] Tests: generator determinism, API schema, no-leakage, latency
- [ ] README + slides + demo video

## Suggested team split (4 people)
1. **ML lead**: data, features, models, evaluation
2. **Backend**: API, risk engine, explainer, store, retrain
3. **Frontend A**: `/pay` warning experience
4. **Frontend B / PM**: dashboard, slides, demo script, docs

## 5-minute demo script
1. **(30 s) Problem**: UPI scams are creative; the user taps "Pay" themselves.
2. **(60 s) Scenario 1, fake refund collect**: warning "You are about to PAY ₹5,000, not receive." Show reasons.
3. **(45 s) Scenario 2, QR swap** and **Scenario 3, screen-share**: red high-risk with cooling-off.
4. **(30 s) Legit flows pass**: genuine refund, rent payment, new friend. No friction.
5. **(60 s) Analyst dashboard**: trends, categories, SHAP drivers, flagged list.
6. **(60 s) Adaptivity**: unseen scam → flagged as "unusual" → analyst labels → retrain → recall up.
7. **(15 s) Metrics slide**: precision / recall / FPR, baseline comparison, honest limitations.

## Slide outline
Problem → Insight (context + behaviour) → Architecture → Scenarios → Results (table) → Explainability → Adaptivity → Dashboard → Integration path → Limitations/Future.
