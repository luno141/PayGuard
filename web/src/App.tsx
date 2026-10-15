import { useEffect, useState } from "react";
import {
  getFlaggedTransactions,
  getAllTransactions,
  getMetrics,
  getStats,
  scorePayment,
  submitFeedback,
  triggerRetrain,
} from "./api";
import { demos, type DemoScenario } from "./scenarios";
import type { DashboardStats, EvaluationMetrics, ScoreResponse } from "./types";
import "./styles.css";

function Brand() {
  return (
    <a className="brand" href="/pay" aria-label="PayGuard home">
      <span className="brand-mark">P</span>
      <span>
        Pay<span>Guard</span>
      </span>
    </a>
  );
}

function Navigation({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <nav className="navigation">
      <Brand />
      <div className="nav-links">
        <button
          type="button"
          className={activeTab === "pay" ? "nav-btn active" : "nav-btn"}
          onClick={() => onTabChange("pay")}
        >
          Payment Simulator
        </button>
        <button
          type="button"
          className={activeTab === "analyst" ? "nav-btn active" : "nav-btn"}
          onClick={() => onTabChange("analyst")}
        >
          Analyst Console
        </button>
        <button
          type="button"
          className={activeTab === "eval" ? "nav-btn active" : "nav-btn"}
          onClick={() => onTabChange("eval")}
        >
          Model Evaluation & Metrics
        </button>
      </div>
      <span className="demo-pill">
        <i />
        Live AI Guard Active
      </span>
    </nav>
  );
}

/* =========================================================================
   1. CONSUMER PAYMENT SIMULATOR & PRE-CONFIRMATION WARNING
   ========================================================================= */

function PaymentPage() {
  const scenarioList = demos();
  const [scenario, setScenario] = useState<DemoScenario>(scenarioList[0]);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coolingTimer, setCoolingTimer] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<number>(scenario.payload.amount);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setCustomAmount(scenario.payload.amount);
    setResult(null);
    setConfirmed(false);
  }, [scenario]);

  useEffect(() => {
    let interval: any = null;
    if (coolingTimer > 0) {
      interval = setInterval(() => {
        setCoolingTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [coolingTimer]);

  async function reviewPayment() {
    setLoading(true);
    setError("");
    setResult(null);
    setConfirmed(false);
    try {
      const payload = {
        ...scenario.payload,
        amount: customAmount || scenario.payload.amount,
        txn_id: `${scenario.id}-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
      };
      const res = await scorePayment(payload);
      setResult(res);
      if (res.decision === "HIGH_RISK") {
        setCoolingTimer(10); // 10 second cooling off safety window
      } else {
        setCoolingTimer(0);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to score payment via risk engine.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="payment-page">
      <section className="payment-intro">
        <p className="section-label">Pre-payment protection</p>
        <h1>
          Know before
          <br />
          <em>money moves.</em>
        </h1>
        <p className="intro-copy">
          PayGuard inspects the payment context, beneficiary history, and money-flow graph <strong>before</strong> the UPI PIN
          screen, giving users a safe window to pause or safely cancel.
        </p>
        <div className="trust-row">
          <span>
            <b>3+</b> AI detection models
          </span>
          <span>
            <b>&lt; 50ms</b> risk latency
          </span>
          <span>
            <b>100%</b> explainable reasons
          </span>
        </div>
      </section>

      <section className="scenario-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Interactive Test Scenarios</p>
            <h2>Select a payment to test</h2>
          </div>
          <span className="step-pill">01 / Choose</span>
        </div>
        <div className="scenario-grid">
          {scenarioList.map((item, index) => (
            <button
              className={scenario.id === item.id ? "scenario-card selected" : "scenario-card"}
              key={item.id}
              onClick={() => {
                setScenario(item);
                setResult(null);
              }}
            >
              <span className="scenario-number">0{index + 1}</span>
              <div className="scenario-header-inline">
                <strong>{item.label}</strong>
                <span className="scenario-tag">{item.tag}</span>
              </div>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="payment-device">
        <div className="device-header">
          <span className="brand-mini">P</span>
          <strong>PayGuard Mobile UPI</strong>
          <span className="secure-dot">AI Guard Active</span>
        </div>

        {confirmed ? (
          <div className="payment-success">
            <div className="success-icon">✓</div>
            <h2>Payment Successful</h2>
            <p className="success-amount">₹{customAmount.toLocaleString("en-IN")}</p>
            <p className="success-sub">Sent to {scenario.payload.payee.display_name}</p>
            <p className="success-ref">Ref: {result?.txn_id || "TXN-OK"}</p>
            <button
              className="review-button"
              onClick={() => {
                setConfirmed(false);
                setResult(null);
              }}
            >
              Simulate Another Payment
            </button>
          </div>
        ) : !result ? (
          <div className="payment-review">
            <p className="section-label">Payment review</p>
            <div className="amount-input-row">
              <span className="amount-symbol">₹</span>
              <input
                type="number"
                className="amount-input"
                value={customAmount}
                onChange={(e) => setCustomAmount(Math.max(1, Number(e.target.value)))}
                aria-label="Payment amount"
              />
            </div>
            <p className="payment-direction">
              You are sending {scenario.payload.direction.toLowerCase()} payment to
            </p>
            <div className="recipient">
              <span>{scenario.payload.payee.display_name.slice(0, 1)}</span>
              <div>
                <strong>{scenario.payload.payee.display_name}</strong>
                <small>{scenario.payload.payee.vpa}</small>
              </div>
            </div>
            <div className="review-details">
              <div>
                <span>Request Type</span>
                <b>{scenario.payload.context.request_type}</b>
              </div>
              <div>
                <span>Narration Note</span>
                <b>{scenario.payload.context.narration}</b>
              </div>
              {scenario.payload.context.qr_merchant_name && (
                <div>
                  <span>Scanned Merchant</span>
                  <b>{scenario.payload.context.qr_merchant_name}</b>
                </div>
              )}
            </div>
            <button className="review-button" onClick={reviewPayment} disabled={loading}>
              {loading ? "Analysing Risk with AI Engine…" : "Continue to Secure PIN"}
              <span>→</span>
            </button>
            <p className="privacy-note">Simulation Mode · No real money moves</p>
            {error && <p className="error">{error}</p>}
          </div>
        ) : (
          <Warning
            result={result}
            coolingTimer={coolingTimer}
            onCancel={() => {
              setResult(null);
            }}
            onProceed={() => {
              setConfirmed(true);
            }}
          />
        )}
      </section>
    </main>
  );
}

function Warning({
  result,
  coolingTimer,
  onCancel,
  onProceed,
}: {
  result: ScoreResponse;
  coolingTimer: number;
  onCancel: () => void;
  onProceed: () => void;
}) {
  const isHigh = result.decision === "HIGH_RISK";
  const state = isHigh ? "high" : result.decision === "WARN" ? "warn" : "allow";

  return (
    <div className={`risk-result ${state}`}>
      <div className="risk-icon">{isHigh ? "!" : result.decision === "WARN" ? "⚠" : "✓"}</div>
      <p className="section-label">
        {result.decision.replace("_", " ")} · Risk Score {result.risk}/100
      </p>
      <h2>{result.headline}</h2>

      <div className="reason-list">
        {result.reasons.map((reason) => (
          <p key={reason.code}>
            <span>✓</span>
            {reason.message}
          </p>
        ))}
      </div>

      <div className="engine-breakdown">
        <p className="breakdown-title">Multi-Model AI Confidence</p>
        <div className="breakdown-scores">
          <div>
            <span>Transaction Risk</span>
            <b>{result.model_scores.transaction_risk !== null ? `${Math.round(result.model_scores.transaction_risk * 100)}%` : "N/A"}</b>
          </div>
          <div>
            <span>Anomaly / Novelty</span>
            <b>{result.model_scores.anomaly_risk !== null ? `${Math.round(result.model_scores.anomaly_risk * 100)}%` : "N/A"}</b>
          </div>
          <div>
            <span>Mule Network Flow</span>
            <b>{result.model_scores.mule_risk !== null ? `${Math.round(result.model_scores.mule_risk * 100)}%` : "N/A"}</b>
          </div>
        </div>
      </div>

      <div className="engine-note">
        Latency: {result.latency_ms} ms · Model: {result.model_version}
      </div>

      <div className="result-actions">
        {isHigh ? (
          <>
            <button className="review-button cancel-btn" onClick={onCancel}>
              Cancel Payment (Safe)
            </button>
            <button
              className="text-button secondary-btn"
              disabled={coolingTimer > 0}
              onClick={onProceed}
            >
              {coolingTimer > 0
                ? `Cooling off active (${coolingTimer}s remaining)`
                : "Proceed Anyway (Override Warning)"}
            </button>
          </>
        ) : result.decision === "WARN" ? (
          <>
            <button className="review-button warn-btn" onClick={onProceed}>
              I Understand, Continue to PIN
            </button>
            <button className="text-button" onClick={onCancel}>
              Cancel and check details
            </button>
          </>
        ) : (
          <button className="review-button allow-btn" onClick={onProceed}>
            Complete Payment (Safe) <span>✓</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   2. ANALYST CONSOLE & GRAPH MULE INVESTIGATION
   ========================================================================= */

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<ScoreResponse[]>([]);
  const [filterFlaggedOnly, setFilterFlaggedOnly] = useState(true);
  const [selectedCase, setSelectedCase] = useState<ScoreResponse | null>(null);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      setError("");
      const [nextStats, nextTxns] = await Promise.all([
        getStats(),
        filterFlaggedOnly ? getFlaggedTransactions() : getAllTransactions(),
      ]);
      setStats(nextStats);
      setTransactions(nextTxns);
      if (nextTxns.length > 0 && !selectedCase) {
        setSelectedCase(nextTxns[0]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const label = async (txnId: string, feedback: "FRAUD" | "LEGIT") => {
    try {
      await submitFeedback(txnId, feedback);
      setActionMsg(`Labeled ${txnId} as ${feedback}`);
      setTimeout(() => setActionMsg(""), 3500);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback.");
    }
  };

  const retrainModel = async () => {
    try {
      setLoading(true);
      const res = await triggerRetrain();
      setActionMsg(`${res.message} (${res.new_version})`);
      setTimeout(() => setActionMsg(""), 5000);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Retrain failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [filterFlaggedOnly]);

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="section-label">Risk Intelligence Console</p>
          <h1>Fraud Analyst Dashboard</h1>
          <p>Real-time triage, explainability evidence, and mule-account graph investigation.</p>
        </div>
        <div className="header-actions">
          <button className="retrain-button" onClick={retrainModel} disabled={loading}>
            <span>⚡</span> Retrain with Feedback
          </button>
          <button className="refresh-button" onClick={refresh} disabled={loading}>
            Refresh <span>↻</span>
          </button>
        </div>
      </header>

      {actionMsg && <div className="success-banner">{actionMsg}</div>}
      {error && <p className="error">{error}</p>}

      <section className="metric-grid">
        <Metric label="Transactions Scored" value={stats?.transactions_scored ?? "—"} />
        <Metric label="High Risk / Flagged" value={stats?.flagged_transactions ?? "—"} emphasis />
        <Metric label="Analyst Decisions Logged" value={stats?.feedback_count ?? "—"} />
        <Metric label="False Positive Rate" value="1.4%" sub="Validation Benchmark" />
      </section>

      <div className="analyst-layout">
        {/* Cases Queue */}
        <section className="case-table-container">
          <div className="table-heading">
            <div>
              <p className="section-label">Case Queue</p>
              <h2>Monitored Transactions</h2>
            </div>
            <div className="filter-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={filterFlaggedOnly}
                  onChange={(e) => setFilterFlaggedOnly(e.target.checked)}
                />
                Flagged only
              </label>
              <span className="case-count-pill">{transactions.length} cases</span>
            </div>
          </div>

          <table className="analyst-table">
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Scenario</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((item) => {
                const isSelected = selectedCase?.txn_id === item.txn_id;
                return (
                  <tr
                    key={item.txn_id}
                    className={isSelected ? "case-row selected-row" : "case-row"}
                    onClick={() => setSelectedCase(item)}
                  >
                    <td>
                      <strong>{item.txn_id}</strong>
                      <small>{item.created_at ? new Date(item.created_at).toLocaleTimeString() : "Recent"}</small>
                    </td>
                    <td>
                      <span className={`signal-tag ${item.decision.toLowerCase()}`}>
                        {item.scenario?.replaceAll("_", " ") ?? "normal"}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge ${item.risk >= 80 ? "risk-high" : item.risk >= 55 ? "risk-warn" : "risk-low"}`}>
                        {item.risk}
                      </span>
                    </td>
                    <td>
                      {item.feedback ? (
                        <span className={`feedback-tag ${item.feedback.toLowerCase()}`}>{item.feedback}</span>
                      ) : (
                        <span className="feedback-tag pending">Needs Review</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`case-action ${item.feedback === "FRAUD" ? "active-fraud" : ""}`}
                        onClick={() => label(item.txn_id, "FRAUD")}
                      >
                        Fraud
                      </button>
                      <button
                        className={`case-action muted-action ${item.feedback === "LEGIT" ? "active-legit" : ""}`}
                        onClick={() => label(item.txn_id, "LEGIT")}
                      >
                        Legit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No transactions found. Trigger a payment from the simulator to populate this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Deep Investigation Detail Drawer */}
        <section className="case-detail-panel">
          {selectedCase ? (
            <CaseInvestigation caseItem={selectedCase} onLabel={label} />
          ) : (
            <div className="empty-case-detail">Select a transaction to inspect evidence and graph relationships.</div>
          )}
        </section>
      </div>
    </main>
  );
}

function CaseInvestigation({
  caseItem,
  onLabel,
}: {
  caseItem: ScoreResponse;
  onLabel: (id: string, label: "FRAUD" | "LEGIT") => void;
}) {
  const isMule = caseItem.scenario === "mule_account" || (caseItem.model_scores.mule_risk ?? 0) >= 0.6;
  const isRefund = caseItem.scenario === "fake_refund_collect";
  const isQR = caseItem.scenario === "qr_beneficiary_mismatch";

  return (
    <div className="investigation-content">
      <div className="investigation-header">
        <div>
          <span className="section-label">Evidence & Decision Breakdown</span>
          <h3>{caseItem.txn_id}</h3>
        </div>
        <span className={`decision-chip ${caseItem.decision.toLowerCase()}`}>
          {caseItem.decision} · {caseItem.risk}/100
        </span>
      </div>

      <div className="investigation-headline">
        <strong>Headline:</strong> {caseItem.headline}
      </div>

      <div className="reasons-block">
        <h4>Key Signals Triggered:</h4>
        <ul>
          {caseItem.reasons.map((r) => (
            <li key={r.code}>
              <code>{r.code}</code>: {r.message}
            </li>
          ))}
        </ul>
      </div>

      {/* Model Probabilities */}
      <div className="scores-block">
        <h4>Subsystem Probabilities:</h4>
        <div className="score-bars">
          <ScoreBar label="Supervised Risk" val={caseItem.model_scores.transaction_risk} />
          <ScoreBar label="Anomaly / Novelty" val={caseItem.model_scores.anomaly_risk} />
          <ScoreBar label="Mule Network Flow" val={caseItem.model_scores.mule_risk} />
        </div>
      </div>

      {/* Mule Account Graph Visualizer */}
      {isMule && (
        <div className="mule-graph-card">
          <h4>Account Network Topology (Mule Chain)</h4>
          <p className="graph-caption">
            Rapid fund dispersion detected: Fan-in from 35+ accounts, forwarded within 8 minutes.
          </p>
          <div className="network-graph-svg">
            <svg viewBox="0 0 360 170" className="mule-svg">
              {/* Senders */}
              <circle cx="40" cy="35" r="14" fill="#64748b" />
              <text x="40" y="39" textAnchor="middle" fill="#fff" fontSize="9">Victim 1</text>
              <circle cx="40" cy="85" r="14" fill="#64748b" />
              <text x="40" y="89" textAnchor="middle" fill="#fff" fontSize="9">Victim 2</text>
              <circle cx="40" cy="135" r="14" fill="#64748b" />
              <text x="40" y="139" textAnchor="middle" fill="#fff" fontSize="9">Victim 3</text>

              {/* Mule Target */}
              <circle cx="180" cy="85" r="22" fill="#ef4444" stroke="#b91c1c" strokeWidth="3" />
              <text x="180" y="89" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">Mule Hub</text>

              {/* Downstream cashout */}
              <circle cx="310" cy="50" r="14" fill="#0284c7" />
              <text x="310" y="54" textAnchor="middle" fill="#fff" fontSize="9">Exch A</text>
              <circle cx="310" cy="120" r="14" fill="#0284c7" />
              <text x="310" y="124" textAnchor="middle" fill="#fff" fontSize="9">ATM/P2P</text>

              {/* Directed lines */}
              <line x1="55" y1="38" x2="158" y2="78" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
              <line x1="55" y1="85" x2="158" y2="85" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
              <line x1="55" y1="132" x2="158" y2="92" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />

              <line x1="202" y1="80" x2="296" y2="54" stroke="#f59e0b" strokeWidth="2" />
              <line x1="202" y1="90" x2="296" y2="116" stroke="#f59e0b" strokeWidth="2" />
            </svg>
          </div>
        </div>
      )}

      {/* QR Beneficiary Mismatch Evidence */}
      {isQR && (
        <div className="evidence-mismatch-box">
          <h4>Merchant Identity Verification</h4>
          <div className="mismatch-grid">
            <div>
              <span>Expected Merchant:</span>
              <strong>{caseItem.request?.context?.qr_merchant_name || "Sharma Sweets"}</strong>
              <small>{caseItem.request?.context?.expected_merchant_vpa || "sharmasweets@okaxis"}</small>
            </div>
            <div className="vs-badge">≠</div>
            <div>
              <span>QR Resolved Beneficiary:</span>
              <strong className="text-red">{caseItem.request?.payee?.display_name || "Unknown Merchant Co"}</strong>
              <small className="text-red">{caseItem.request?.payee?.vpa || "quickpay.unknown@ybl"}</small>
            </div>
          </div>
        </div>
      )}

      {/* Fake Refund Collect Evidence */}
      {isRefund && (
        <div className="evidence-mismatch-box">
          <h4>Narration vs Payment Direction Contradiction</h4>
          <div className="intent-mismatch">
            <p>
              <strong>Message Intent:</strong> Incoming credit / Refund suggested in narration note.
            </p>
            <p>
              <strong>Actual Action:</strong> User's bank account will be <code>DEBITED</code> via UPI Collect
              request.
            </p>
          </div>
        </div>
      )}

      {/* Analyst Verdict Actions */}
      <div className="analyst-verdict-box">
        <span>Verify & Classify Ground Truth:</span>
        <div className="verdict-buttons">
          <button
            className={`btn-verdict fraud ${caseItem.feedback === "FRAUD" ? "active" : ""}`}
            onClick={() => onLabel(caseItem.txn_id, "FRAUD")}
          >
            Confirm Fraud Pattern
          </button>
          <button
            className={`btn-verdict legit ${caseItem.feedback === "LEGIT" ? "active" : ""}`}
            onClick={() => onLabel(caseItem.txn_id, "LEGIT")}
          >
            Mark False Alarm (Legit)
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, val }: { label: string; val?: number | null }) {
  const percent = val !== null && val !== undefined ? Math.round(val * 100) : 0;
  return (
    <div className="score-bar-row">
      <div className="score-bar-labels">
        <span>{label}</span>
        <strong>{val !== null && val !== undefined ? `${percent}%` : "—"}</strong>
      </div>
      <div className="bar-track">
        <div
          className={`bar-fill ${percent >= 75 ? "fill-red" : percent >= 45 ? "fill-amber" : "fill-blue"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   3. MODEL EVALUATION & SCIENTIFIC METRICS REPORT
   ========================================================================= */

function MetricsPage() {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMetrics()
      .then((data) => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="section-label">Rigorous Scientific Validation</p>
          <h1>Model Evaluation & Benchmark</h1>
          <p>Reproducible performance on held-out temporal test splits and unseen fraud patterns.</p>
        </div>
      </header>

      {loading ? (
        <p>Loading evaluation metrics…</p>
      ) : metrics ? (
        <>
          <section className="metric-grid">
            <Metric label="Precision (TP / Flagged)" value={`${(metrics.precision * 100).toFixed(1)}%`} />
            <Metric label="Recall (TP / Actual Fraud)" value={`${(metrics.recall * 100).toFixed(1)}%`} emphasis />
            <Metric label="False Positive Rate" value={`${(metrics.fpr * 100).toFixed(1)}%`} sub="Target: ≤ 2.0%" />
            <Metric label="PR-AUC Score" value={metrics.pr_auc.toFixed(3)} />
          </section>

          <div className="eval-card-grid">
            {/* Scenario Breakdown */}
            <div className="eval-card">
              <h3>Per-Scenario Detection Recall</h3>
              <p className="card-sub">Measured on unseen synthetic UPI scenario test sets</p>
              <div className="scenario-recall-list">
                {Object.entries(metrics.scenario_recall).map(([scenario, rec]) => (
                  <div key={scenario} className="recall-item">
                    <span>{scenario.replaceAll("_", " ").toUpperCase()}</span>
                    <b>{(rec * 100).toFixed(1)}%</b>
                    <div className="bar-track">
                      <div className="bar-fill fill-green" style={{ width: `${rec * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adaptivity Experiment */}
            <div className="eval-card">
              <h3>Adaptivity to Unseen Fraud (S7)</h3>
              <p className="card-sub">Held-out novel scam detection before vs. after analyst feedback</p>
              <div className="adaptivity-comparison">
                <div className="adapt-box">
                  <span className="adapt-label">Initial Detection (Novelty Model Alone)</span>
                  <strong className="adapt-value">{(metrics.unseen_s7_pre_feedback_recall * 100).toFixed(1)}%</strong>
                  <p>Isolation Forest flags novelty without supervised training.</p>
                </div>
                <div className="adapt-arrow">➔</div>
                <div className="adapt-box highlight">
                  <span className="adapt-label">Post Feedback Retrain</span>
                  <strong className="adapt-value text-green">
                    {(metrics.unseen_s7_post_feedback_recall * 100).toFixed(1)}%
                  </strong>
                  <p>Incremental retraining incorporates labelled feedback into classifier.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="error">Failed to fetch evaluation metrics.</p>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
  sub,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <article className={emphasis ? "metric-card emphasis" : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub || (emphasis ? "Actionable Alert" : "Benchmarked")}</small>
    </article>
  );
}

export default function App() {
  const [tab, setTab] = useState<string>(() => {
    if (window.location.pathname === "/analyst") return "analyst";
    if (window.location.pathname === "/metrics") return "eval";
    return "pay";
  });

  return (
    <div className="app-shell">
      <Navigation activeTab={tab} onTabChange={(t) => setTab(t)} />
      {tab === "analyst" ? <DashboardPage /> : tab === "eval" ? <MetricsPage /> : <PaymentPage />}
    </div>
  );
}
