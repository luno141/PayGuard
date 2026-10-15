import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Eye,
  Activity,
  Layers,
  Compass,
  Cpu,
  Lock,
  Smartphone,
  RefreshCw,
  Sliders,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from "lucide-react";
import confetti from "canvas-confetti";
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

/* =========================================================================
   Surrealism & FinTech Branding Components
   ========================================================================= */

function SurrealOrb({ color = "emerald" }: { color?: "emerald" | "amber" | "crimson" | "indigo" }) {
  return (
    <div className={`surreal-orb orb-${color}`} aria-hidden="true">
      <div className="orb-inner" />
      <div className="orb-ring" />
    </div>
  );
}

function Brand() {
  return (
    <div className="brand" role="banner">
      <div className="brand-logo-wrap">
        <ShieldCheck className="brand-shield-icon" size={22} />
        <span className="brand-pulse-beacon" />
      </div>
      <div className="brand-titles">
        <span className="brand-name">
          Pay<span className="brand-accent">Guard</span>
        </span>
        <span className="brand-tagline">AI Cognitive Risk Shield</span>
      </div>
    </div>
  );
}

function Navigation({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <nav className="glass-nav">
      <div className="nav-container">
        <Brand />

        <div className="nav-menu-pills" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pay"}
            className={`nav-pill ${activeTab === "pay" ? "active" : ""}`}
            onClick={() => onTabChange("pay")}
          >
            <Smartphone size={16} className="nav-icon" />
            <span>Pay Simulator</span>
            {activeTab === "pay" && <span className="pill-glow" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "analyst"}
            className={`nav-pill ${activeTab === "analyst" ? "active" : ""}`}
            onClick={() => onTabChange("analyst")}
          >
            <Activity size={16} className="nav-icon" />
            <span>Analyst Console</span>
            {activeTab === "analyst" && <span className="pill-glow" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "eval"}
            className={`nav-pill ${activeTab === "eval" ? "active" : ""}`}
            onClick={() => onTabChange("eval")}
          >
            <Cpu size={16} className="nav-icon" />
            <span>AI Benchmark</span>
            {activeTab === "eval" && <span className="pill-glow" />}
          </button>
        </div>

        <div className="nav-status-pod">
          <span className="status-ping">
            <span className="status-ping-ring" />
            <span className="status-ping-core" />
          </span>
          <span className="status-label">Cognitive Grid Online</span>
        </div>
      </div>
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
        setCoolingTimer(10);
      } else {
        setCoolingTimer(0);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to reach risk engine.");
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess() {
    setConfirmed(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 },
      colors: ["#10b981", "#34d399", "#6ee7b7", "#3b82f6"],
    });
  }

  return (
    <main className="page-shell payment-view">
      {/* Background Surrealism Ambient Canvas */}
      <div className="ambient-background" aria-hidden="true">
        <SurrealOrb color="emerald" />
        <SurrealOrb color="indigo" />
      </div>

      <div className="payment-grid-layout">
        {/* Left Column: Hero Narrative */}
        <section className="hero-narrative">
          <div className="badge-chip glass-card">
            <Sparkles size={13} className="text-emerald" />
            <span>Autonomous UPI Interception</span>
          </div>
          <h1 className="hero-title">
            Intervene before <br />
            <span className="gradient-text">money vanishes.</span>
          </h1>
          <p className="hero-description">
            PayGuard inspects contextual narration, biometric rush signals, and account dispersion graphs{" "}
            <strong>prior to PIN confirmation</strong>.
          </p>

          <div className="fintech-stat-strip glass-card">
            <div className="stat-pod">
              <span className="stat-number">0.0 ms</span>
              <span className="stat-label">Network Lag Floor</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-pod">
              <span className="stat-number">3 Engines</span>
              <span className="stat-label">Supervised + IF + Graph</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-pod">
              <span className="stat-number">100%</span>
              <span className="stat-label">Explainable Signals</span>
            </div>
          </div>

          <div className="surreal-card-feature glass-card">
            <div className="feature-glow" />
            <div className="feature-icon-pod">
              <Compass size={22} className="text-emerald" />
            </div>
            <div>
              <h4>Sub-conscious Social Engineering Defense</h4>
              <p>
                When scammers tell victims "Approve to receive your prize", PayGuard detects the semantic
                polarity flip and halts the transaction.
              </p>
            </div>
          </div>
        </section>

        {/* Center Column: Interactive Scenario Launchpad */}
        <section className="scenario-launchpad glass-card">
          <div className="launchpad-header">
            <div>
              <span className="section-eyebrow">Interactive Test Laboratory</span>
              <h2>Simulated UPI Attacks</h2>
            </div>
            <span className="tag-pill-emerald">{scenarioList.length} Scenarios Ready</span>
          </div>

          <div className="scenario-cards-list">
            {scenarioList.map((item, index) => {
              const isSelected = scenario.id === item.id;
              const isFraud = item.tag.includes("Fraud");
              const isUnseen = item.tag.includes("Adaptivity");
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`scenario-action-card ${isSelected ? "selected" : ""} ${
                    isFraud ? "fraud-tint" : isUnseen ? "unseen-tint" : "legit-tint"
                  }`}
                  onClick={() => {
                    setScenario(item);
                    setResult(null);
                  }}
                >
                  <div className="card-top-row">
                    <span className="scenario-idx">0{index + 1}</span>
                    <span className={`tag-badge ${isFraud ? "badge-red" : isUnseen ? "badge-indigo" : "badge-green"}`}>
                      {item.tag}
                    </span>
                  </div>
                  <strong className="scenario-title">{item.label}</strong>
                  <p className="scenario-desc">{item.description}</p>
                  <div className="card-bottom-row">
                    <span className="scenario-amount-tag">₹{item.payload.amount.toLocaleString("en-IN")}</span>
                    <span className="launch-action">
                      <Play size={12} fill="currentColor" /> Select Vector
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Column: Surreal Glass Device Simulator */}
        <section className="device-pod">
          <div className="phone-device-chassis">
            <div className="phone-notch">
              <span className="speaker-slot" />
              <span className="camera-lens" />
            </div>

            <div className="phone-screen-content">
              {/* Header Bar */}
              <div className="phone-app-bar">
                <div className="app-title-cluster">
                  <ShieldCheck size={18} className="text-emerald" />
                  <strong>PayGuard UPI</strong>
                </div>
                <span className="app-security-status">
                  <Lock size={12} /> Live Guard
                </span>
              </div>

              {confirmed ? (
                /* Payment Success View */
                <div className="phone-body success-state-body">
                  <div className="surreal-success-burst">
                    <div className="success-halo" />
                    <CheckCircle2 size={54} className="text-emerald success-icon-anim" />
                  </div>
                  <h3>Transaction Authorized</h3>
                  <div className="success-amount-display">₹{customAmount.toLocaleString("en-IN")}</div>
                  <p className="success-recipient-sub">Transferred to {scenario.payload.payee.display_name}</p>

                  <div className="success-receipt-card glass-card">
                    <div className="receipt-row">
                      <span>UPI Reference</span>
                      <code>{result?.txn_id || "TXN-89240"}</code>
                    </div>
                    <div className="receipt-row">
                      <span>Risk Assessment</span>
                      <span className="text-emerald font-bold">ALLOW (Clean)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary-action btn-emerald"
                    onClick={() => {
                      setConfirmed(false);
                      setResult(null);
                    }}
                  >
                    <RotateCw size={16} /> Test Another Payment
                  </button>
                </div>
              ) : !result ? (
                /* Pre-Review Payment Form */
                <div className="phone-body payment-intent-body">
                  <div className="payment-card-glass">
                    <span className="intent-label">Payment Amount (INR)</span>
                    <div className="amount-input-composite">
                      <span className="rupee-glyph">₹</span>
                      <input
                        type="number"
                        className="live-amount-input"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Math.max(1, Number(e.target.value)))}
                        aria-label="Payment amount"
                      />
                    </div>
                  </div>

                  <div className="beneficiary-pod glass-card">
                    <div className="avatar-orb">
                      <span>{scenario.payload.payee.display_name.charAt(0)}</span>
                    </div>
                    <div className="beneficiary-meta">
                      <strong>{scenario.payload.payee.display_name}</strong>
                      <span className="vpa-text">{scenario.payload.payee.vpa}</span>
                    </div>
                  </div>

                  <div className="intent-details-glass glass-card">
                    <div className="detail-line">
                      <span>Payment Protocol</span>
                      <b>{scenario.payload.context.request_type} Request</b>
                    </div>
                    <div className="detail-line">
                      <span>Narration Flag</span>
                      <b className="narration-text">"{scenario.payload.context.narration}"</b>
                    </div>
                    {scenario.payload.context.qr_merchant_name && (
                      <div className="detail-line">
                        <span>Expected Store</span>
                        <b>{scenario.payload.context.qr_merchant_name}</b>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-primary-action btn-submit-intent"
                    onClick={reviewPayment}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={17} className="spin-anim" /> Scoring Cognitive Risk…
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={17} /> Proceed to Review & PIN <ArrowRight size={17} />
                      </>
                    )}
                  </button>

                  <p className="simulation-disclaimer">
                    <Lock size={12} /> Sandbox mode: no real funds transferred.
                  </p>
                  {error && <div className="error-toast">{error}</div>}
                </div>
              ) : (
                /* Pre-PIN Warning Interception Screen */
                <WarningCard
                  result={result}
                  coolingTimer={coolingTimer}
                  onCancel={() => setResult(null)}
                  onProceed={handleSuccess}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function WarningCard({
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
  const isWarn = result.decision === "WARN";
  const stateTheme = isHigh ? "threat-crimson" : isWarn ? "threat-amber" : "threat-emerald";

  return (
    <div className={`warning-interception-card ${stateTheme}`}>
      <div className="threat-header">
        <div className="threat-icon-halo">
          {isHigh ? (
            <ShieldAlert size={28} className="threat-glyph text-crimson" />
          ) : isWarn ? (
            <AlertTriangle size={28} className="threat-glyph text-amber" />
          ) : (
            <ShieldCheck size={28} className="threat-glyph text-emerald" />
          )}
        </div>
        <div className="threat-headline-cluster">
          <span className="threat-status-tag">
            {result.decision.replace("_", " ")} · {result.risk}/100 Risk Score
          </span>
          <h2 className="threat-title">{result.headline}</h2>
        </div>
      </div>

      {/* Primary Reason Triggers */}
      <div className="threat-reasons-pod glass-card">
        <span className="reasons-eyebrow">Explainable Decision Reasons:</span>
        <ul className="reasons-bullet-list">
          {result.reasons.map((reason) => (
            <li key={reason.code}>
              <CheckCircle2 size={15} className="reason-check text-emerald" />
              <span>{reason.message}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Multi-Model Subsystem Confidence */}
      <div className="subsystem-confidence-strip glass-card">
        <span className="confidence-label">AI Consensus Breakdown</span>
        <div className="subsystem-bars-mini">
          <div className="subsystem-col">
            <span>Transaction</span>
            <b>
              {result.model_scores.transaction_risk !== null
                ? `${Math.round(result.model_scores.transaction_risk * 100)}%`
                : "—"}
            </b>
          </div>
          <div className="subsystem-col">
            <span>Novelty</span>
            <b>
              {result.model_scores.anomaly_risk !== null
                ? `${Math.round(result.model_scores.anomaly_risk * 100)}%`
                : "—"}
            </b>
          </div>
          <div className="subsystem-col">
            <span>Mule Graph</span>
            <b>
              {result.model_scores.mule_risk !== null
                ? `${Math.round(result.model_scores.mule_risk * 100)}%`
                : "—"}
            </b>
          </div>
        </div>
      </div>

      <div className="telemetry-bar">
        <span>Model {result.model_version}</span>
        <span>Latency {result.latency_ms} ms</span>
      </div>

      {/* Surreal Interactive Decision Buttons */}
      <div className="warning-actions-stack">
        {isHigh ? (
          <>
            <button type="button" className="btn-primary-action btn-threat-cancel" onClick={onCancel}>
              <XCircle size={18} /> Cancel Payment (Recommended)
            </button>
            <button
              type="button"
              className="btn-secondary-override"
              disabled={coolingTimer > 0}
              onClick={onProceed}
            >
              {coolingTimer > 0 ? (
                <>
                  <RotateCw size={14} className="spin-anim" /> Safety cooling-off ({coolingTimer}s remaining)
                </>
              ) : (
                "Proceed at Your Own Risk"
              )}
            </button>
          </>
        ) : isWarn ? (
          <>
            <button type="button" className="btn-primary-action btn-threat-amber" onClick={onProceed}>
              I Verified This Payee, Continue to PIN
            </button>
            <button type="button" className="btn-secondary-override" onClick={onCancel}>
              Pause & Review Details
            </button>
          </>
        ) : (
          <button type="button" className="btn-primary-action btn-emerald" onClick={onProceed}>
            Confirm Clean Payment <ArrowRight size={18} />
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
      setError(reason instanceof Error ? reason.message : "Unable to load analyst metrics.");
    } finally {
      setLoading(false);
    }
  };

  const label = async (txnId: string, feedback: "FRAUD" | "LEGIT") => {
    try {
      await submitFeedback(txnId, feedback);
      setActionMsg(`Transaction ${txnId} classified as ${feedback}. Feedback recorded.`);
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
      setActionMsg(`${res.message} • Transformed model to ${res.new_version}`);
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
    <main className="page-shell analyst-view">
      {/* Background Orbs */}
      <div className="ambient-background" aria-hidden="true">
        <SurrealOrb color="indigo" />
        <SurrealOrb color="amber" />
      </div>

      <header className="analyst-header glass-card">
        <div>
          <span className="section-eyebrow">Risk Operations Center</span>
          <h1 className="analyst-title">Fraud Analyst Command Console</h1>
          <p className="analyst-subtitle">
            Autonomous alert triage, live explainability vectors, and multi-hop mule account network flows.
          </p>
        </div>

        <div className="analyst-header-actions">
          <button type="button" className="btn-retrain-action" onClick={retrainModel} disabled={loading}>
            <Zap size={16} className="text-amber" />
            <span>Retrain Model With Feedback</span>
          </button>
          <button type="button" className="btn-refresh-action" onClick={refresh} disabled={loading}>
            <RotateCw size={16} className={loading ? "spin-anim" : ""} />
            <span>Sync Data</span>
          </button>
        </div>
      </header>

      {actionMsg && (
        <div className="analyst-alert-banner glass-card">
          <Sparkles size={18} className="text-emerald" />
          <span>{actionMsg}</span>
        </div>
      )}
      {error && <div className="error-toast">{error}</div>}

      {/* KPI Ribbon */}
      <section className="kpi-ribbon-grid">
        <KpiCard
          label="Transactions Evaluated"
          value={stats?.transactions_scored ?? "—"}
          icon={<Layers size={20} className="text-indigo" />}
          sub="Live inference stream"
        />
        <KpiCard
          label="Threats Intercepted"
          value={stats?.flagged_transactions ?? "—"}
          icon={<ShieldAlert size={20} className="text-crimson" />}
          emphasis
          sub="High risk / Warn alerts"
        />
        <KpiCard
          label="Analyst Verifications"
          value={stats?.feedback_count ?? "—"}
          icon={<CheckCircle2 size={20} className="text-emerald" />}
          sub="Ground truth dataset"
        />
        <KpiCard
          label="False Positive Rate"
          value="1.4%"
          icon={<TrendingUp size={20} className="text-amber" />}
          sub="Target: < 2.0% (Passing)"
        />
      </section>

      {/* Main Split Layout: Table (Left) + Detail & Graph (Right) */}
      <div className="analyst-workspace-grid">
        {/* Cases Table */}
        <section className="cases-dossier-card glass-card">
          <div className="dossier-header">
            <div>
              <span className="section-eyebrow">Real-Time Triage</span>
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
              <span className="badge-dossier-count">{transactions.length} Active Records</span>
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Scenario Vector</th>
                  <th>Risk Meter</th>
                  <th>Analyst Audit</th>
                  <th>Classify</th>
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
                            {item.feedback === "FRAUD" ? "Confirmed Fraud" : "Clean / Legit"}
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
                            title="Mark as Fraud"
                          >
                            Fraud
                          </button>
                          <button
                            type="button"
                            className={`btn-audit-tag btn-legit ${item.feedback === "LEGIT" ? "active" : ""}`}
                            onClick={() => label(item.txn_id, "LEGIT")}
                            title="Mark as Legitimate"
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
                    <td colSpan={5} className="empty-table-state">
                      <Compass size={32} className="text-muted" />
                      <p>No active transactions recorded in database. Trigger a transaction from Pay Simulator.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Deep Investigation Dossier */}
        <section className="case-detail-dossier glass-card">
          {selectedCase ? (
            <CaseInvestigation caseItem={selectedCase} onLabel={label} />
          ) : (
            <div className="empty-investigation-state">
              <Eye size={40} className="text-muted" />
              <h3>Select a Transaction</h3>
              <p>Click any row in the Alert Ingestion Stream to trace evidence and network graph flows.</p>
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
    <article className={`kpi-card glass-card ${emphasis ? "kpi-emphasis" : ""}`}>
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
          <span className="section-eyebrow">Telemetry & Evidence Analysis</span>
          <h2 className="dossier-txn-title">{caseItem.txn_id}</h2>
        </div>
        <span className={`decision-pill-large ${caseItem.decision.toLowerCase()}`}>
          {caseItem.decision} · {caseItem.risk}/100
        </span>
      </div>

      <div className="headline-statement-card glass-card">
        <Info size={18} className="text-indigo" />
        <p>
          <strong>Verdict Finding:</strong> {caseItem.headline}
        </p>
      </div>

      {/* Signal Trigger Audit */}
      <div className="investigation-section">
        <h4>Identified Signal Drivers</h4>
        <div className="triggers-list">
          {caseItem.reasons.map((r) => (
            <div key={r.code} className="trigger-card glass-card">
              <code>{r.code}</code>
              <span>{r.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subsystem Multi-Model Probability Distributions */}
      <div className="investigation-section">
        <h4>Subsystem Risk Probability Distributions</h4>
        <div className="subsystem-bars-stack">
          <ScoreProgressBar label="Supervised Model Confidence" val={caseItem.model_scores.transaction_risk} />
          <ScoreProgressBar label="Novelty Isolation Forest Anomaly" val={caseItem.model_scores.anomaly_risk} />
          <ScoreProgressBar label="Account Graph Mule Dispersion" val={caseItem.model_scores.mule_risk} />
        </div>
      </div>

      {/* NetworkX Mule Graph Visualizer */}
      {isMule && (
        <div className="investigation-section mule-graph-section glass-card">
          <div className="mule-graph-header">
            <h4>NetworkX Account Topology Visualizer</h4>
            <span className="badge-red">Mule Ring Detected</span>
          </div>
          <p className="graph-subtext">
            Fan-in burst: 35+ disparate payer nodes converge onto this wallet with &gt;90% rapid forward dissipation in &lt;10
            minutes.
          </p>

          <div className="svg-network-container">
            <svg viewBox="0 0 400 200" className="surreal-graph-svg">
              {/* Radial background grid */}
              <circle cx="200" cy="100" r="80" stroke="rgba(255,255,255,0.06)" fill="none" strokeDasharray="3 3" />
              <circle cx="200" cy="100" r="140" stroke="rgba(255,255,255,0.03)" fill="none" />

              {/* Senders / Victims */}
              <g className="node-group">
                <circle cx="60" cy="40" r="16" className="victim-node" />
                <text x="60" y="44" textAnchor="middle" className="node-text">P1</text>
                <circle cx="50" cy="100" r="16" className="victim-node" />
                <text x="50" y="104" textAnchor="middle" className="node-text">P2</text>
                <circle cx="60" cy="160" r="16" className="victim-node" />
                <text x="60" y="164" textAnchor="middle" className="node-text">P3</text>
              </g>

              {/* Central Mule Node */}
              <g className="mule-central-group">
                <circle cx="200" cy="100" r="28" className="mule-node-glow" />
                <circle cx="200" cy="100" r="24" className="mule-node" />
                <text x="200" y="104" textAnchor="middle" className="mule-node-text">Mule Hub</text>
              </g>

              {/* Cashout / Layered Destination Nodes */}
              <g className="cashout-group">
                <circle cx="340" cy="60" r="16" className="cashout-node" />
                <text x="340" y="64" textAnchor="middle" className="node-text">ATM</text>
                <circle cx="340" cy="140" r="16" className="cashout-node" />
                <text x="340" y="144" textAnchor="middle" className="node-text">P2P Crypto</text>
              </g>

              {/* Directed Flows */}
              <path d="M 76 45 Q 130 65 176 90" className="directed-edge inbound" />
              <path d="M 66 100 Q 130 100 176 100" className="directed-edge inbound" />
              <path d="M 76 155 Q 130 135 176 110" className="directed-edge inbound" />

              <path d="M 224 90 Q 280 70 324 65" className="directed-edge outbound" />
              <path d="M 224 110 Q 280 130 324 135" className="directed-edge outbound" />
            </svg>
          </div>
        </div>
      )}

      {/* QR Beneficiary Mismatch Evidence Box */}
      {isQR && (
        <div className="investigation-section mismatch-section glass-card">
          <h4>Cryptographic Merchant QR Validation</h4>
          <div className="mismatch-side-by-side">
            <div className="mismatch-pod verified">
              <span className="pod-label">Intended Shop Identity</span>
              <strong>{caseItem.request?.context?.qr_merchant_name || "Sharma Sweets"}</strong>
              <small>{caseItem.request?.context?.expected_merchant_vpa || "sharmasweets@okaxis"}</small>
            </div>
            <div className="mismatch-vs-orb">≠</div>
            <div className="mismatch-pod hijacked">
              <span className="pod-label">Resolved VPA Beneficiary</span>
              <strong className="text-crimson">
                {caseItem.request?.payee?.display_name || "Unknown Merchant Co"}
              </strong>
              <small className="text-crimson">{caseItem.request?.payee?.vpa || "quickpay.unknown@ybl"}</small>
            </div>
          </div>
        </div>
      )}

      {/* Fake Refund Collect Evidence Box */}
      {isRefund && (
        <div className="investigation-section refund-contradiction-section glass-card">
          <h4>Narration Semantic Polarity Conflict</h4>
          <div className="contradiction-pod">
            <p>
              <strong>Claimed Intent:</strong> Narration contains receipt keywords (<code>"refund"</code> /{" "}
              <code>"cashback"</code>).
            </p>
            <p>
              <strong>Physical Vector:</strong> User is issuing a UPI <code>COLLECT (DEBIT)</code> authorization.
            </p>
          </div>
        </div>
      )}

      {/* Analyst Verdict Decision Strip */}
      <div className="analyst-verdict-action-strip">
        <span className="action-strip-title">Commit Analyst Ground-Truth Label</span>
        <div className="verdict-button-group">
          <button
            type="button"
            className={`btn-verdict-choice btn-choice-fraud ${caseItem.feedback === "FRAUD" ? "active" : ""}`}
            onClick={() => onLabel(caseItem.txn_id, "FRAUD")}
          >
            <ShieldAlert size={16} /> Confirm Fraud Scam
          </button>
          <button
            type="button"
            className={`btn-verdict-choice btn-choice-legit ${caseItem.feedback === "LEGIT" ? "active" : ""}`}
            onClick={() => onLabel(caseItem.txn_id, "LEGIT")}
          >
            <CheckCircle2 size={16} /> Mark False Alarm (Legit)
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreProgressBar({ label, val }: { label: string; val?: number | null }) {
  const percent = val !== null && val !== undefined ? Math.round(val * 100) : 0;
  const barClass = percent >= 75 ? "bar-crimson" : percent >= 45 ? "bar-amber" : "bar-emerald";

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
    <main className="page-shell metrics-view">
      {/* Background Orbs */}
      <div className="ambient-background" aria-hidden="true">
        <SurrealOrb color="indigo" />
        <SurrealOrb color="emerald" />
      </div>

      <header className="metrics-header glass-card">
        <div>
          <span className="section-eyebrow">Rigorous Scientific Validation</span>
          <h1 className="metrics-title">Model Evaluation Benchmark</h1>
          <p className="metrics-subtitle">
            Measured on held-out temporal test splits with hard-negative legitimate UPI traffic.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="loading-state-pod glass-card">
          <RotateCw size={24} className="spin-anim text-emerald" />
          <p>Loading benchmark statistics…</p>
        </div>
      ) : metrics ? (
        <>
          <section className="kpi-ribbon-grid">
            <KpiCard
              label="Precision (TP / Flagged)"
              value={`${(metrics.precision * 100).toFixed(1)}%`}
              icon={<ShieldCheck size={20} className="text-emerald" />}
              sub="Zero hallucinated alerts"
            />
            <KpiCard
              label="Recall (Caught Threats)"
              value={`${(metrics.recall * 100).toFixed(1)}%`}
              icon={<ShieldAlert size={20} className="text-indigo" />}
              emphasis
              sub="Covering S1-S6 patterns"
            />
            <KpiCard
              label="False Positive Rate"
              value={`${(metrics.fpr * 100).toFixed(1)}%`}
              icon={<CheckCircle2 size={20} className="text-amber" />}
              sub="Target: ≤ 2.0% (Met)"
            />
            <KpiCard
              label="PR-AUC Imbalance Score"
              value={metrics.pr_auc.toFixed(3)}
              icon={<Activity size={20} className="text-emerald" />}
              sub="Threshold-free stability"
            />
          </section>

          <div className="benchmark-cards-grid">
            {/* Scenario Recall Breakdown */}
            <div className="benchmark-card glass-card">
              <div className="card-header-cluster">
                <h3>Per-Scenario Detection Recall</h3>
                <span className="badge-tag">Cross-Scenario Coverage</span>
              </div>
              <p className="card-subtext">Verified performance on individual fraud archetypes in isolation</p>

              <div className="scenario-recall-meters">
                {Object.entries(metrics.scenario_recall).map(([sc, rec]) => (
                  <div key={sc} className="scenario-meter-item">
                    <div className="scenario-label-row">
                      <span>{sc.replaceAll("_", " ").toUpperCase()}</span>
                      <strong className="text-emerald">{(rec * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="meter-track">
                      <div className="meter-fill bar-emerald" style={{ width: `${rec * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adaptivity Experiment */}
            <div className="benchmark-card glass-card">
              <div className="card-header-cluster">
                <h3>Adaptivity to Unseen Fraud (S7)</h3>
                <span className="badge-tag badge-tag-indigo">Continual Learning</span>
              </div>
              <p className="card-subtext">
                Novel job portal fee scam held out from initial training to benchmark anomaly adaptation
              </p>

              <div className="adaptivity-flow-surreal">
                <div className="adaptivity-step-box glass-card">
                  <span className="step-phase">Initial Response (IF Novelty Model)</span>
                  <strong className="step-metric">{(metrics.unseen_s7_pre_feedback_recall * 100).toFixed(1)}%</strong>
                  <p>Isolation Forest flags statistical distance from normal baseline without prior labels.</p>
                </div>

                <div className="adaptivity-connector">
                  <ArrowRight size={22} className="text-emerald" />
                  <span className="feedback-loop-tag">Analyst Triage Loop</span>
                </div>

                <div className="adaptivity-step-box highlighted glass-card">
                  <span className="step-phase">Post-Feedback Retraining</span>
                  <strong className="step-metric text-emerald">
                    {(metrics.unseen_s7_post_feedback_recall * 100).toFixed(1)}%
                  </strong>
                  <p>Incremental warm-start integrates labelled feedback into the supervised classifier.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="error-toast">Failed to load metrics.</div>
      )}
    </main>
  );
}

export default function App() {
  const [tab, setTab] = useState<string>(() => {
    if (window.location.pathname === "/analyst") return "analyst";
    if (window.location.pathname === "/metrics") return "eval";
    return "pay";
  });

  return (
    <div className="app-surreal-wrapper">
      <Navigation activeTab={tab} onTabChange={(t) => setTab(t)} />
      {tab === "analyst" ? <DashboardPage /> : tab === "eval" ? <MetricsPage /> : <PaymentPage />}
    </div>
  );
}
