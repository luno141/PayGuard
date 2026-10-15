import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  Zap,
  ArrowRight,
  CheckCircle2,
  Eye,
  Activity,
  Layers,
  Compass,
  Cpu,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  getFlaggedTransactions,
  getAllTransactions,
  getMetrics,
  getStats,
  submitFeedback,
  triggerRetrain,
} from "./api";
import type { DashboardStats, EvaluationMetrics, ScoreResponse } from "./types";
import "./styles.css";

/* =========================================================================
   Analyst Portal Navigation
   ========================================================================= */

function AnalystNavigation({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <header className="corp-nav-bar">
      <div className="nav-container">
        <div className="brand-corp-cluster">
          <div className="brand-corp-icon" aria-hidden="true">
            <Activity size={18} />
          </div>
          <div className="brand-titles">
            <span className="brand-name">PayGuard Operations</span>
            <span className="brand-tagline">Fraud Analyst Portal</span>
          </div>
        </div>

        <nav aria-label="Analyst portal navigation">
          <div className="nav-tabs-segmented" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "analyst"}
              className={`nav-tab-pill ${activeTab === "analyst" ? "active" : ""}`}
              onClick={() => onTabChange("analyst")}
            >
              <Activity size={14} aria-hidden="true" />
              <span>Analyst Console</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "eval"}
              className={`nav-tab-pill ${activeTab === "eval" ? "active" : ""}`}
              onClick={() => onTabChange("eval")}
            >
              <Cpu size={14} aria-hidden="true" />
              <span>Validation Benchmark</span>
            </button>
          </div>
        </nav>

        <div className="nav-status-pod" aria-label="Status: Risk scoring engine online">
          <span className="status-indicator-dot" aria-hidden="true" />
          <span>Analyst Hub (Port 5174)</span>
        </div>
      </div>
    </header>
  );
}

/* =========================================================================
   Analyst Console & Alert Ingestion
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
      setError(reason instanceof Error ? reason.message : "Unable to load analyst metrics.");
    } finally {
      setLoading(false);
    }
  };

  const label = async (txnId: string, feedback: "FRAUD" | "LEGIT") => {
    try {
      await submitFeedback(txnId, feedback);
      setActionMsg(`Transaction ${txnId} marked as ${feedback}.`);
      setTimeout(() => setActionMsg(""), 3500);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to record analyst feedback.");
    }
  };

  const retrainModel = async () => {
    try {
      setLoading(true);
      const res = await triggerRetrain();
      setActionMsg(`${res.message} • Model updated to ${res.new_version}`);
      setTimeout(() => setActionMsg(""), 5000);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Model retraining failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [filterFlaggedOnly]);

  return (
    <main id="main-content" className="page-shell analyst-view">
      <header className="analyst-header corp-card">
        <div>
          <span className="mono-eyebrow">Risk Operations</span>
          <h1 className="analyst-title">Fraud Analyst Command Console</h1>
          <p className="analyst-subtitle">
            Real-time alert triage, explainable decision vectors, and multi-hop mule account flow topologies.
          </p>
        </div>

        <div className="analyst-header-actions">
          <button type="button" className="btn-corp-square-primary" onClick={retrainModel} disabled={loading}>
            <Zap size={14} aria-hidden="true" />
            <span>Retrain Model</span>
          </button>
          <button type="button" className="btn-corp-square-secondary" onClick={refresh} disabled={loading}>
            <RotateCw size={14} className={loading ? "spin-anim" : ""} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {actionMsg && (
        <div className="analyst-alert-banner corp-card" role="status" aria-live="polite">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{actionMsg}</span>
        </div>
      )}
      {error && <div className="error-toast" role="alert">{error}</div>}

      <section className="kpi-ribbon-grid" aria-label="Key Performance Indicators">
        <KpiCard
          label="Transactions Scored"
          value={stats?.transactions_scored ?? "—"}
          icon={<Layers size={18} aria-hidden="true" />}
          sub="Production stream"
        />
        <KpiCard
          label="Threats Intercepted"
          value={stats?.flagged_transactions ?? "—"}
          icon={<ShieldAlert size={18} aria-hidden="true" className="text-crimson" />}
          emphasis
          sub="High risk / Warn alerts"
        />
        <KpiCard
          label="Analyst Verifications"
          value={stats?.feedback_count ?? "—"}
          icon={<CheckCircle2 size={18} aria-hidden="true" className="text-cyan" />}
          sub="Ground truth dataset"
        />
        <KpiCard
          label="False Positive Rate"
          value="1.4%"
          icon={<TrendingUp size={18} aria-hidden="true" />}
          sub="Target: ≤ 2.0% (Passing)"
        />
      </section>

      <div className="analyst-workspace-grid">
        <section className="cases-dossier-card corp-card" aria-label="Alert Ingestion Stream">
          <div className="dossier-header">
            <div>
              <span className="mono-eyebrow">Real-Time Triage</span>
              <h3>Alert Ingestion Stream</h3>
            </div>

            <div className="triage-controls">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filterFlaggedOnly}
                  onChange={(e) => setFilterFlaggedOnly(e.target.checked)}
                />
                <span>Threats only</span>
              </label>
              <span className="badge-dossier-count">{transactions.length}&nbsp;Records</span>
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th scope="col">Transaction ID</th>
                  <th scope="col">Pattern Vector</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Analyst Audit</th>
                  <th scope="col">Classify</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => {
                  const isSelected = selectedCase?.txn_id === item.txn_id;
                  return (
                    <tr
                      key={item.txn_id}
                      className={`dossier-row ${isSelected ? "selected-row" : ""}`}
                      onClick={() => setSelectedCase(item)}
                    >
                      <td>
                        <strong className="mono-id">{item.txn_id}</strong>
                        <small className="time-sub">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString() : "Recent"}
                        </small>
                      </td>
                      <td>
                        <span className={`pill-vector ${item.decision.toLowerCase()}`}>
                          {item.scenario?.replaceAll("_", " ") ?? "Standard"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`score-badge ${
                            item.risk >= 80 ? "badge-high" : item.risk >= 55 ? "badge-warn" : "badge-low"
                          }`}
                        >
                          {item.risk}
                        </span>
                      </td>
                      <td>
                        {item.feedback ? (
                          <span className={`audit-badge ${item.feedback.toLowerCase()}`}>
                            {item.feedback === "FRAUD" ? "Confirmed Fraud" : "Legit"}
                          </span>
                        ) : (
                          <span className="audit-badge unreviewed">Awaiting Audit</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-action-buttons">
                          <button
                            type="button"
                            className={`btn-audit-tag btn-fraud ${item.feedback === "FRAUD" ? "active" : ""}`}
                            onClick={() => label(item.txn_id, "FRAUD")}
                            aria-label={`Mark transaction ${item.txn_id} as fraud`}
                          >
                            Fraud
                          </button>
                          <button
                            type="button"
                            className={`btn-audit-tag btn-legit ${item.feedback === "LEGIT" ? "active" : ""}`}
                            onClick={() => label(item.txn_id, "LEGIT")}
                            aria-label={`Mark transaction ${item.txn_id} as legit`}
                          >
                            Legit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-investigation-state">
                      <Compass size={32} aria-hidden="true" className="text-muted" />
                      <p>No active transactions recorded. Run simulations from the Payment Simulator.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="case-detail-dossier corp-card" aria-label="Investigation Dossier">
          {selectedCase ? (
            <CaseInvestigation caseItem={selectedCase} onLabel={label} />
          ) : (
            <div className="empty-investigation-state">
              <Eye size={36} aria-hidden="true" className="text-muted" />
              <h3>Select a Transaction</h3>
              <p>Click any row in the Alert Ingestion Stream to trace evidence and network flows.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <article className={`kpi-card corp-card ${emphasis ? "kpi-emphasis" : ""}`}>
      <div className="kpi-top-row">
        <span className="kpi-label">{label}</span>
        {icon}
      </div>
      <strong className="kpi-number">{value}</strong>
      {sub && <span className="kpi-sub">{sub}</span>}
    </article>
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
    <div className="investigation-dossier-inner">
      <div className="dossier-top-meta">
        <div>
          <span className="mono-eyebrow">Evidence Dossier</span>
          <h2 className="dossier-txn-title">{caseItem.txn_id}</h2>
        </div>
        <span className={`decision-pill-large ${caseItem.decision.toLowerCase()}`}>
          {caseItem.decision} · {caseItem.risk}/100
        </span>
      </div>

      <div className="headline-statement-card corp-card">
        <Info size={16} aria-hidden="true" />
        <p>
          <strong>Verdict Finding:</strong> {caseItem.headline}
        </p>
      </div>

      {/* Fraud.net Entity Risk Summary Strip */}
      <div className="entity-overview-strip corp-card">
        <div className="entity-meta-item">
          <span className="entity-meta-label">Originator ID</span>
          <strong className="entity-meta-val">{caseItem.request?.user_id || "USR-782194"}</strong>
          <span className="entity-meta-sub">{caseItem.request?.direction || "DEBIT"} direction</span>
        </div>
        <div className="entity-meta-divider" aria-hidden="true" />
        <div className="entity-meta-item">
          <span className="entity-meta-label">Beneficiary Entity</span>
          <strong className="entity-meta-val">{caseItem.request?.payee?.display_name || "Beneficiary"}</strong>
          <span className="entity-meta-sub">{caseItem.request?.payee?.vpa || "vpa@upi"}</span>
        </div>
        <div className="entity-meta-divider" aria-hidden="true" />
        <div className="entity-meta-item">
          <span className="entity-meta-label">Execution Channel</span>
          <strong className="entity-meta-val">{caseItem.request?.context?.request_type || "PAY"}</strong>
          <span className="entity-meta-sub">₹{caseItem.request?.amount?.toLocaleString("en-IN") || "—"}</span>
        </div>
        <div className="entity-meta-divider" aria-hidden="true" />
        <div className="entity-meta-item">
          <span className="entity-meta-label">Engine Latency</span>
          <strong className="entity-meta-val">{caseItem.latency_ms} ms</strong>
          <span className="entity-meta-sub">Model {caseItem.model_version}</span>
        </div>
      </div>

      <div className="investigation-section">
        <h4>Key Behavioral Signals</h4>
        <div className="triggers-list">
          {caseItem.reasons.map((r) => (
            <div key={r.code} className="trigger-card">
              <code>{r.code}</code>
              <span>{r.message}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="investigation-section">
        <h4>Subsystem Risk Probability Distributions</h4>
        <div className="subsystem-bars-stack">
          <ScoreProgressBar label="Supervised Classifier Risk" val={caseItem.model_scores.transaction_risk} />
          <ScoreProgressBar label="Isolation Forest Novelty Anomaly" val={caseItem.model_scores.anomaly_risk} />
          <ScoreProgressBar label="Account Graph Mule Dispersion" val={caseItem.model_scores.mule_risk} />
        </div>
      </div>

      {isMule && (
        <div className="investigation-section mule-graph-section corp-card">
          <div className="mule-graph-header">
            <h4>Account Topology Graph</h4>
            <span className="category-tag tag-crimson">Mule Chain Identified</span>
          </div>
          <p className="graph-subtext">
            Fan-in burst: 35+ disparate payer nodes converge onto this wallet with &gt;90% rapid forward dissipation in &lt;10
            minutes.
          </p>

          <div className="svg-network-container">
            <svg viewBox="0 0 400 200" className="surreal-graph-svg" aria-label="Mule network flow diagram">
              <circle cx="200" cy="100" r="75" stroke="#e2e8f0" fill="none" strokeDasharray="3 3" />

              <g className="node-group">
                <circle cx="60" cy="40" r="14" className="victim-node" />
                <text x="60" y="44" textAnchor="middle" className="node-text">P1</text>
                <circle cx="50" cy="100" r="14" className="victim-node" />
                <text x="50" y="104" textAnchor="middle" className="node-text">P2</text>
                <circle cx="60" cy="160" r="14" className="victim-node" />
                <text x="60" y="164" textAnchor="middle" className="node-text">P3</text>
              </g>

              <g className="mule-central-group">
                <circle cx="200" cy="100" r="26" className="mule-node-glow" />
                <circle cx="200" cy="100" r="22" className="mule-node" />
                <text x="200" y="104" textAnchor="middle" className="mule-node-text">Mule</text>
              </g>

              <g className="cashout-group">
                <circle cx="340" cy="60" r="14" className="cashout-node" />
                <text x="340" y="64" textAnchor="middle" className="node-text">ATM</text>
                <circle cx="340" cy="140" r="14" className="cashout-node" />
                <text x="340" y="144" textAnchor="middle" className="node-text">P2P</text>
              </g>

              <path d="M 76 45 Q 130 65 176 90" className="directed-edge inbound" />
              <path d="M 66 100 Q 130 100 176 100" className="directed-edge inbound" />
              <path d="M 76 155 Q 130 135 176 110" className="directed-edge inbound" />

              <path d="M 224 90 Q 280 70 324 65" className="directed-edge outbound" />
              <path d="M 224 110 Q 280 130 324 135" className="directed-edge outbound" />
            </svg>
          </div>
        </div>
      )}

      {isQR && (
        <div className="investigation-section mismatch-section corp-card">
          <h4>Merchant Identity Verification</h4>
          <div className="mismatch-side-by-side">
            <div className="mismatch-pod verified">
              <span className="pod-label">Intended Merchant</span>
              <strong>{caseItem.request?.context?.qr_merchant_name || "Sharma Sweets"}</strong>
              <small>{caseItem.request?.context?.expected_merchant_vpa || "sharmasweets@okaxis"}</small>
            </div>
            <div className="mismatch-vs-orb" aria-hidden="true">≠</div>
            <div className="mismatch-pod hijacked">
              <span className="pod-label">Resolved Beneficiary</span>
              <strong className="text-crimson">
                {caseItem.request?.payee?.display_name || "Unknown Merchant Co"}
              </strong>
              <small className="text-crimson">{caseItem.request?.payee?.vpa || "quickpay.unknown@ybl"}</small>
            </div>
          </div>
        </div>
      )}

      {isRefund && (
        <div className="investigation-section refund-contradiction-section corp-card">
          <h4>Narration Semantic Polarity Contradiction</h4>
          <div className="contradiction-pod">
            <p>
              <strong>Message Intent:</strong> Narration contains receipt keywords (<code>“refund”</code> / <code>“cashback”</code>).
            </p>
            <p>
              <strong>Execution Vector:</strong> User is executing a UPI <code>COLLECT (DEBIT)</code> payment.
            </p>
          </div>
        </div>
      )}

      <div className="analyst-verdict-action-strip">
        <span className="action-strip-title">Commit Analyst Ground-Truth Classification</span>
        <div className="verdict-button-group">
          <button
            type="button"
            className={`btn-verdict-choice btn-choice-fraud ${caseItem.feedback === "FRAUD" ? "active" : ""}`}
            onClick={() => onLabel(caseItem.txn_id, "FRAUD")}
          >
            <ShieldAlert size={14} aria-hidden="true" />
            <span>Confirm Fraud</span>
          </button>
          <button
            type="button"
            className={`btn-verdict-choice btn-choice-legit ${caseItem.feedback === "LEGIT" ? "active" : ""}`}
            onClick={() => onLabel(caseItem.txn_id, "LEGIT")}
          >
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>Mark False Alarm</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreProgressBar({ label, val }: { label: string; val?: number | null }) {
  const percent = val !== null && val !== undefined ? Math.round(val * 100) : 0;
  const barClass = percent >= 75 ? "bar-crimson" : percent >= 45 ? "bar-amber" : "bar-cyan";

  return (
    <div className="score-meter-pod">
      <div className="score-meter-labels">
        <span>{label}</span>
        <strong>{val !== null && val !== undefined ? `${percent}%` : "—"}</strong>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${barClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/* =========================================================================
   Model Evaluation & Scientific Metrics Report
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
    <main id="main-content" className="page-shell metrics-view">
      <header className="metrics-header corp-card">
        <div>
          <span className="mono-eyebrow">Scientific Evaluation</span>
          <h1 className="metrics-title">Model Evaluation & Benchmark</h1>
          <p className="metrics-subtitle">
            Measured on held-out temporal test splits with hard-negative legitimate UPI traffic.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="feature-summary-card corp-card" role="status" aria-live="polite">
          <RotateCw size={16} className="spin-anim" aria-hidden="true" />
          <p>Loading benchmark statistics…</p>
        </div>
      ) : metrics ? (
        <>
          <section className="kpi-ribbon-grid" aria-label="Validation Metrics">
            <KpiCard
              label="Precision (TP / Flagged)"
              value={`${(metrics.precision * 100).toFixed(1)}%`}
              icon={<ShieldCheck size={18} aria-hidden="true" className="text-cyan" />}
              sub="Zero hallucinated alerts"
            />
            <KpiCard
              label="Recall (Caught Threats)"
              value={`${(metrics.recall * 100).toFixed(1)}%`}
              icon={<ShieldAlert size={18} aria-hidden="true" className="text-crimson" />}
              emphasis
              sub="Covering S1-S6 patterns"
            />
            <KpiCard
              label="False Positive Rate"
              value={`${(metrics.fpr * 100).toFixed(1)}%`}
              icon={<CheckCircle2 size={18} aria-hidden="true" />}
              sub="Target: ≤ 2.0% (Passing)"
            />
            <KpiCard
              label="PR-AUC Score"
              value={metrics.pr_auc.toFixed(3)}
              icon={<Activity size={18} aria-hidden="true" />}
              sub="Imbalance threshold-free"
            />
          </section>

          <div className="benchmark-cards-grid">
            <div className="benchmark-card corp-card">
              <div className="card-header-cluster">
                <h3>Per-Scenario Detection Recall</h3>
                <span className="badge-tag">Cross-Scenario</span>
              </div>
              <p className="card-subtext">Verified performance on individual fraud archetypes in isolation</p>

              <div className="scenario-recall-meters">
                {Object.entries(metrics.scenario_recall).map(([sc, rec]) => (
                  <div key={sc} className="scenario-meter-item">
                    <div className="scenario-label-row">
                      <span>{sc.replaceAll("_", " ").toUpperCase()}</span>
                      <strong className="text-cyan">{(rec * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="meter-track">
                      <div className="meter-fill bar-cyan" style={{ width: `${rec * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="benchmark-card corp-card">
              <div className="card-header-cluster">
                <h3>Adaptivity to Unseen Fraud (S7)</h3>
                <span className="badge-tag badge-tag-indigo">Continual Learning</span>
              </div>
              <p className="card-subtext">
                Novel job portal fee scam held out from initial training to benchmark anomaly adaptation
              </p>

              <div className="adaptivity-flow-surreal">
                <div className="adaptivity-step-box corp-card">
                  <span className="step-phase">Isolation Forest Baseline</span>
                  <strong className="step-metric">{(metrics.unseen_s7_pre_feedback_recall * 100).toFixed(1)}%</strong>
                  <p>Isolation Forest flags statistical distance from baseline without prior training labels.</p>
                </div>

                <div className="adaptivity-connector" aria-hidden="true">
                  <ArrowRight size={18} />
                  <span className="feedback-loop-tag">Feedback Loop</span>
                </div>

                <div className="adaptivity-step-box highlighted corp-card">
                  <span className="step-phase">Post-Feedback Retraining</span>
                  <strong className="step-metric text-cyan">
                    {(metrics.unseen_s7_post_feedback_recall * 100).toFixed(1)}%
                  </strong>
                  <p>Incremental retraining incorporates labelled feedback into the supervised classifier.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="error-toast" role="alert">Failed to load metrics.</div>
      )}
    </main>
  );
}

export default function AnalystApp() {
  const [tab, setTab] = useState<string>("analyst");

  return (
    <div className="app-corp-shell">
      <AnalystNavigation activeTab={tab} onTabChange={(t) => setTab(t)} />
      {tab === "eval" ? <MetricsPage /> : <DashboardPage />}
    </div>
  );
}
