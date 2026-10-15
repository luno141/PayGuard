import { useState, useEffect } from "react";
import { RotateCw, ShieldAlert, Activity, Wifi, Terminal } from "lucide-react";

interface PacketFieldInfo {
  val: string;
  raw: string;
  hot: boolean;
  label?: string;
}

interface HandshakePacket {
  seq: number;
  time: string;
  src: string;
  dst: string;
  proto: "TCP" | "TLS 1.3" | "HTTP/2" | "ISO 8583";
  flags?: string;
  length: number;
  info: string;
  detail: string;
  highlight?: "syn" | "ack" | "tls" | "post" | "block" | "normal";
}

const HANDSHAKE_PACKETS: HandshakePacket[] = [
  {
    seq: 1,
    time: "0.000000",
    src: "192.168.1.4:52148",
    dst: "10.0.0.8:8000",
    proto: "TCP",
    flags: "[SYN]",
    length: 74,
    info: "52148 → 8000 Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1 WS=128",
    detail: "Victim client initiates 3-way TCP handshake to PayGuard security proxy. Requesting connection.",
    highlight: "syn",
  },
  {
    seq: 2,
    time: "0.000412",
    src: "10.0.0.8:8000",
    dst: "192.168.1.4:52148",
    proto: "TCP",
    flags: "[SYN, ACK]",
    length: 74,
    info: "8000 → 52148 Seq=0 Ack=1 Win=65160 Len=0 MSS=1460 SACK_PERM=1 WS=128",
    detail: "PayGuard core acknowledges connection request and synchronizes sequence numbers.",
    highlight: "ack",
  },
  {
    seq: 3,
    time: "0.000624",
    src: "192.168.1.4:52148",
    dst: "10.0.0.8:8000",
    proto: "TCP",
    flags: "[ACK]",
    length: 66,
    info: "52148 → 8000 Seq=1 Ack=1 Win=64240 Len=0",
    detail: "Victim client acknowledges server response. TCP layer 4 connection ESTABLISHED.",
    highlight: "ack",
  },
  {
    seq: 4,
    time: "0.001850",
    src: "192.168.1.4:52148",
    dst: "10.0.0.8:8000",
    proto: "TLS 1.3",
    length: 512,
    info: "Client Hello, Supported Groups: x25519, secp256r1, ALPN: h2",
    detail: "Victim UPI client sends TLS ClientHello proposing AES_256_GCM_SHA384 and HTTP/2 protocol negotiation.",
    highlight: "tls",
  },
  {
    seq: 5,
    time: "0.003420",
    src: "10.0.0.8:8000",
    dst: "192.168.1.4:52148",
    proto: "TLS 1.3",
    length: 1280,
    info: "Server Hello, Change Cipher Spec, Handshake Encrypted Extensions, Certificate, Finished",
    detail: "PayGuard confirms TLS 1.3 session keys. Mutual cryptographic channel secured against eavesdropping.",
    highlight: "tls",
  },
  {
    seq: 6,
    time: "0.004110",
    src: "192.168.1.4:52148",
    dst: "10.0.0.8:8000",
    proto: "TLS 1.3",
    flags: "[ACK]",
    length: 66,
    info: "Change Cipher Spec, Finished",
    detail: "Session established in 4.1ms. Both endpoints switch to authenticated encrypted streaming.",
    highlight: "tls",
  },
  {
    seq: 7,
    time: "0.007800",
    src: "192.168.1.4:52148",
    dst: "10.0.0.8:8000",
    proto: "HTTP/2",
    length: 1847,
    info: "POST /score (Headers + Data: req_type=COLLECT, amt=4999, payee=refund.scam@ybl, nar=refund)",
    detail: "Application payload delivered: Disguised fake refund COLLECT debit payload entering ML inspection pipeline.",
    highlight: "post",
  },
  {
    seq: 8,
    time: "0.012500",
    src: "10.0.0.8:8000",
    dst: "103.55.22.1:9000",
    proto: "ISO 8583",
    length: 420,
    info: "MTI 0200 (Acquirer Financial Request) UPI Pre-Auth Verification Query",
    detail: "PayGuard queries NPCI Central Switch for VPA existence & payee risk registry records.",
    highlight: "normal",
  },
  {
    seq: 9,
    time: "0.024100",
    src: "103.55.22.1:9000",
    dst: "10.0.0.8:8000",
    proto: "ISO 8583",
    length: 380,
    info: "MTI 0210 (Acquirer Financial Response) Payee Account Age: 3 days, Risk Index: 0.74",
    detail: "NPCI confirms payee account created 72 hours ago with 47 distinct senders.",
    highlight: "normal",
  },
  {
    seq: 10,
    time: "0.031200",
    src: "10.0.0.8:8000",
    dst: "192.168.1.4:52148",
    proto: "HTTP/2",
    length: 890,
    info: "HTTP/2 200 OK (DECISION: HIGH_RISK, Risk: 94/100, Action: PRE_PIN_SAFETY_HALT)",
    detail: "PayGuard intercepts fraud in 31ms before UPI PIN prompt. Transaction halted.",
    highlight: "block",
  },
  {
    seq: 11,
    time: "0.031400",
    src: "10.0.0.8:8000",
    dst: "103.55.22.1:9000",
    proto: "ISO 8583",
    length: 220,
    info: "MTI 0420 (Acquirer Reversal / Cancellation Notice) Fraud Signal Interception",
    detail: "PayGuard sends abort signal to NPCI. No funds debited from payer account.",
    highlight: "block",
  },
];

const PACKET_DATA = {
  header: {
    "Version": { val: "UPI/2.0", raw: "55 50 49 2F 32 2E 30", hot: false },
    "Txn-ID": { val: "TXN-FR-20241015-0044", raw: "54 58 4E 2D 46 52 2D 32 30", hot: false },
    "Timestamp": { val: "2024-10-15T11:48:22Z", raw: "32 30 32 34 2D 31 30", hot: false },
    "Seq-Num": { val: "0x00A4", raw: "00 A4", hot: false },
  },
  transaction: {
    "Direction": { val: "DEBIT (Collect Request)", raw: "44 45 42 49 54", hot: true, label: "⚠ COLLECT — funds flow OUT of victim" },
    "Amount-INR": { val: "₹4,999.00", raw: "00 00 13 87", hot: false },
    "Payer-VPA": { val: "victim@okicici", raw: "76 69 63 74 69 6D", hot: false },
    "Payee-VPA": { val: "refund.scam@ybl", raw: "72 65 66 75 6E 64", hot: true, label: "⚠ Payee account age: 3 days" },
    "Payee-Name": { val: "Quick Refunds Ltd", raw: "51 75 69 63 6B 20", hot: true, label: "⚠ Non-merchant entity claiming refund" },
  },
  context: {
    "Request-Type": { val: "COLLECT", raw: "43 4F 4C 4C 45 43 54", hot: true, label: "⚠ Pull debit masquerading as payout" },
    "Narration": { val: "\"Approve to get your refund ₹4999\"", raw: "41 70 70 72 6F 76 65", hot: true, label: "🔴 NLP: REFUND keyword on DEBIT vector" },
    "Link-Risk": { val: "0.00 (no phishing link)", raw: "30 2E 30 30", hot: false },
    "Expected-Payee": { val: "N/A (Disguised P2P)", raw: "4E 2F 41", hot: false },
  },
  device: {
    "Device-ID": { val: "dev-f8a21c9b", raw: "64 65 76 2D 66 38", hot: false },
    "Call-Active": { val: "true (Phone Call Active)", raw: "01", hot: true, label: "🔴 Active cellular call during txn" },
    "Screen-Share": { val: "false", raw: "00", hot: false },
    "Confirm-Delay": { val: "4.2s (Fast Action)", raw: "34 2E 32", hot: false },
  },
  network: {
    "Payee-Senders-24h": { val: "47 distinct payers", raw: "00 2F", hot: true, label: "⚠ Abnormal fan-in velocity" },
    "Dissipation-1h": { val: "0.94 (94%)", raw: "5E 70", hot: true, label: "⚠ Rapid forward dissipation" },
    "Median-Fwd-Delay": { val: "7.3 minutes", raw: "07 13", hot: true, label: "⚠ High risk velocity" },
  }
};

const ENGINE_STEPS = [
  { ms: 150, col: "muted", msg: "→ Inbound TCP/TLS stream captured (192.168.1.4:52148 → 10.0.0.8:8000)" },
  { ms: 300, col: "muted", msg: "→ HTTP/2 POST /score payload deserialized [Content-Length: 1,847 bytes]" },
  { ms: 500, col: "warn", msg: "⚡ Context Parser: Direction=DEBIT, Request-Type=COLLECT" },
  { ms: 650, col: "danger", msg: "🔴 Rule Gate: Semantic Contradiction — Narration claims 'refund/reversal' on DEBIT" },
  { ms: 850, col: "muted", msg: "→ Extracted 22-dimensional numerical & NLP feature vector" },
  { ms: 1000, col: "warn", msg: "⚠ Supervised Classifier: probability=0.887 (Threshold 0.55 exceeded)" },
  { ms: 1150, col: "warn", msg: "⚠ Isolation Forest Novelty: anomaly_score=0.813 (Statistical baseline outlier)" },
  { ms: 1300, col: "danger", msg: "🔴 NetworkX Graph Engine: fan_in=47 payers, forward_dissipation=94% (Mule=0.74)" },
  { ms: 1450, col: "muted", msg: "→ Ensemble Fusion (0.50×GBM + 0.30×IF + 0.20×Graph) + Hard Rule Gate" },
  { ms: 1550, col: "danger", msg: "🔴 Overriding Floor Applied: NARRATION_POLARITY_CONTRADICTION" },
  { ms: 1650, col: "danger", msg: "━━━ FINAL RISK VERDICT: 94 / 100  [HIGH_RISK] ━━━" },
  { ms: 1750, col: "safe", msg: "✓ Pre-PIN Safety Interception triggered — 10s cooldown enforced on device" },
  { ms: 1800, col: "safe", msg: "✓ Real-time inference latency: 31 ms (Within NPCI <50ms limit)" },
];

export function PacketTransferSimulationModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"handshake" | "payload">("handshake");
  const [selectedPacket, setSelectedPacket] = useState<HandshakePacket | null>(HANDSHAKE_PACKETS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<{ msg: string; col: string; id: number }[]>([]);
  const [revealedSections, setRevealedSections] = useState<string[]>([]);
  const [verdictReady, setVerdictReady] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [activeStep, setActiveStep] = useState<"idle" | "client_to_payguard" | "analyzing" | "intercepted">("idle");

  const startSimulation = () => {
    setIsRunning(true);
    setLogs([]);
    setRevealedSections([]);
    setVerdictReady(false);
    setPacketCount(0);
    setActiveStep("client_to_payguard");

    const pInterval = setInterval(() => {
      setPacketCount((c) => c + 1);
    }, 150);

    setTimeout(() => setRevealedSections((s) => [...s, "header"]), 250);
    setTimeout(() => {
      setActiveStep("analyzing");
      setRevealedSections((s) => [...s, "transaction"]);
    }, 600);
    setTimeout(() => setRevealedSections((s) => [...s, "context"]), 1000);
    setTimeout(() => setRevealedSections((s) => [...s, "device"]), 1300);
    setTimeout(() => setRevealedSections((s) => [...s, "network"]), 1600);

    ENGINE_STEPS.forEach((step, idx) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, { msg: step.msg, col: step.col, id: idx }]);
      }, step.ms);
    });

    setTimeout(() => {
      clearInterval(pInterval);
      setActiveStep("intercepted");
      setVerdictReady(true);
      setIsRunning(false);
    }, 1900);
  };

  useEffect(() => {
    startSimulation();
  }, []);

  return (
    <div className="packet-modal-overlay" onClick={onClose}>
      <div className="packet-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="packet-modal-header">
          <div>
            <div className="flex items-center gap-2">
              <span className="mono-eyebrow text-cyan">Analyst Network Inspection</span>
              <span className={`badge-pill-status ${activeStep === "intercepted" ? "status-intercepted" : "status-active"}`}>
                {activeStep === "intercepted" ? "THREAT INTERCEPTED (31ms)" : isRunning ? "INGESTING PACKETS" : "READY"}
              </span>
            </div>
            <h3 className="packet-modal-title">IP Packet Handshake &amp; Wire Trace — Fake Refund Scam</h3>
            <p className="packet-modal-desc">
              Low-level TCP/IP 3-way handshake, TLS 1.3 session negotiation, and UPI 2.0 collect request packet interception.
            </p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="Close packet inspector">
            ✕
          </button>
        </div>

        {/* Network Topology Visualization */}
        <div className="packet-topology-container">
          <div className="packet-node-box">
            <div className="node-icon">📱</div>
            <div className="node-name">Victim Device</div>
            <div className="node-ip">192.168.1.4:52148</div>
            <div className="node-sub">UPI Client App</div>
          </div>

          <div className="packet-flow-pipe">
            <div className="pipe-line" />
            {activeStep === "client_to_payguard" && (
              <div className="flying-packet-dot dot-cyan animate-fly-right">SYN</div>
            )}
            <span className="pipe-label">TCP 3-Way + TLS 1.3</span>
          </div>

          <div className={`packet-node-box payguard-node ${activeStep === "analyzing" ? "analyzing" : activeStep === "intercepted" ? "halted" : ""}`}>
            <div className="node-icon">🛡️</div>
            <div className="node-name">PayGuard Proxy</div>
            <div className="node-ip">10.0.0.8:8000</div>
            <div className="node-sub">Pre-PIN Filter Core</div>
            {activeStep === "intercepted" && <span className="halt-badge">SAFETY HALT</span>}
          </div>

          <div className="packet-flow-pipe">
            <div className="pipe-line pipe-halted" />
            {activeStep === "intercepted" && (
              <div className="flying-packet-dot dot-crimson">MTI 0420</div>
            )}
            <span className="pipe-label text-crimson">ISO 8583 Abort</span>
          </div>

          <div className="packet-node-box npci-node">
            <div className="node-icon">🏛️</div>
            <div className="node-name">NPCI Switch</div>
            <div className="node-ip">103.55.22.1:9000</div>
            <div className="node-sub">Reversal Ack</div>
          </div>

          <div className="packet-flow-pipe">
            <div className="pipe-line pipe-dormant" />
            <span className="pipe-label">ACH Blocked</span>
          </div>

          <div className="packet-node-box fraud-node">
            <div className="node-icon">🎭</div>
            <div className="node-name">Fraudster VPA</div>
            <div className="node-ip">202.88.5.77</div>
            <div className="node-sub">refund.scam@ybl</div>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="packet-view-selector-strip">
          <button
            type="button"
            className={`btn-packet-tab ${activeTab === "handshake" ? "active" : ""}`}
            onClick={() => setActiveTab("handshake")}
          >
            <Wifi size={13} aria-hidden="true" />
            <span>TCP / TLS Handshake Sequence ({HANDSHAKE_PACKETS.length} Frames)</span>
          </button>
          <button
            type="button"
            className={`btn-packet-tab ${activeTab === "payload" ? "active" : ""}`}
            onClick={() => setActiveTab("payload")}
          >
            <Terminal size={13} aria-hidden="true" />
            <span>Decrypted UPI Payload &amp; Hex Inspector</span>
          </button>
        </div>

        {/* Main Content Area */}
        {activeTab === "handshake" ? (
          <div className="packet-handshake-view">
            <div className="handshake-table-wrapper">
              <table className="handshake-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Time (s)</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Protocol</th>
                    <th>Length</th>
                    <th>Info Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {HANDSHAKE_PACKETS.map((pkt) => {
                    const isSelected = selectedPacket?.seq === pkt.seq;
                    return (
                      <tr
                        key={pkt.seq}
                        className={`pkt-row pkt-${pkt.highlight || "normal"} ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedPacket(pkt)}
                      >
                        <td className="mono">{pkt.seq}</td>
                        <td className="mono">{pkt.time}</td>
                        <td className="mono">{pkt.src}</td>
                        <td className="mono">{pkt.dst}</td>
                        <td>
                          <span className={`proto-badge proto-${pkt.proto.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
                            {pkt.proto}
                          </span>
                        </td>
                        <td className="mono">{pkt.length} B</td>
                        <td className="info-cell">
                          {pkt.flags && <span className="flag-tag">{pkt.flags}</span>}
                          <span>{pkt.info}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedPacket && (
              <div className="packet-detail-footer corp-card">
                <div className="detail-header-row">
                  <strong>Frame #{selectedPacket.seq}: {selectedPacket.proto} {selectedPacket.flags || ""}</strong>
                  <span className="mono">{selectedPacket.src} → {selectedPacket.dst}</span>
                </div>
                <p className="detail-description">{selectedPacket.detail}</p>
              </div>
            )}
          </div>
        ) : (
          /* Payload & Hex View */
          <div className="packet-split-grid">
            <div className="packet-inspector-panel">
              <div className="panel-bar">
                <span className="panel-heading">Decrypted Wire Payload (UPI 2.0 Spec)</span>
                <span className="packet-badge-count">PKT #{String(packetCount).padStart(4, "0")}</span>
              </div>

              <div className="packet-fields-scroll">
                {revealedSections.includes("header") && (
                  <div className="packet-section-group">
                    <div className="section-title">── PROTOCOL HEADERS</div>
                    {Object.entries(PACKET_DATA.header).map(([k, v]) => (
                      <PacketRow key={k} fieldKey={k} data={v} />
                    ))}
                  </div>
                )}

                {revealedSections.includes("transaction") && (
                  <div className="packet-section-group">
                    <div className="section-title text-crimson">── TRANSACTION VECTORS</div>
                    {Object.entries(PACKET_DATA.transaction).map(([k, v]) => (
                      <PacketRow key={k} fieldKey={k} data={v} />
                    ))}
                  </div>
                )}

                {revealedSections.includes("context") && (
                  <div className="packet-section-group">
                    <div className="section-title text-crimson">── CONTEXT &amp; NLP SEMANTICS</div>
                    {Object.entries(PACKET_DATA.context).map(([k, v]) => (
                      <PacketRow key={k} fieldKey={k} data={v} />
                    ))}
                  </div>
                )}

                {revealedSections.includes("device") && (
                  <div className="packet-section-group">
                    <div className="section-title text-amber">── CLIENT DEVICE TELEMETRY</div>
                    {Object.entries(PACKET_DATA.device).map(([k, v]) => (
                      <PacketRow key={k} fieldKey={k} data={v} />
                    ))}
                  </div>
                )}

                {revealedSections.includes("network") && (
                  <div className="packet-section-group">
                    <div className="section-title text-crimson">── ACCOUNT TOPOLOGY SIGNALS</div>
                    {Object.entries(PACKET_DATA.network).map(([k, v]) => (
                      <PacketRow key={k} fieldKey={k} data={v} />
                    ))}
                  </div>
                )}
              </div>

              <div className="hex-strip-box">
                <span className="hex-strip-label">Raw Inbound Hex Stream</span>
                <div className="hex-bytes-flow">
                  {Object.values(PACKET_DATA).flatMap((sec) =>
                    Object.values(sec).map((item) =>
                      item.raw.split(" ").map((byte, bIdx) => (
                        <span
                          key={`${item.val}-${bIdx}`}
                          className={`hex-chip ${item.hot ? "hex-chip-hot" : ""}`}
                        >
                          {byte}
                        </span>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="packet-engine-panel">
              <div className="panel-bar">
                <span className="panel-heading">Engine Execution Trace (<span className="text-cyan">31 ms</span>)</span>
                <span className="status-live-indicator">LIVE STREAM</span>
              </div>

              <div className="engine-log-scroll">
                {logs.map((log) => (
                  <div key={log.id} className={`log-entry log-${log.col}`}>
                    {log.msg}
                  </div>
                ))}
                {isRunning && (
                  <div className="log-entry log-muted animate-pulse">
                    Analyzing semantic contradiction tokens…
                  </div>
                )}
              </div>

              {verdictReady && (
                <div className="packet-verdict-card">
                  <div className="verdict-card-head">
                    <ShieldAlert size={18} className="text-crimson" />
                    <div>
                      <h4 className="verdict-status-title">PRE-PIN SAFETY HALT DISPATCHED</h4>
                      <span className="verdict-time-sub">Risk Score: 94/100 · Confidence: 99.1% · Latency: 31ms</span>
                    </div>
                  </div>

                  <div className="verdict-metrics-row">
                    <div className="verdict-metric-cell">
                      <span>Supervised GBM</span>
                      <strong className="text-crimson">88.7%</strong>
                    </div>
                    <div className="verdict-metric-cell">
                      <span>Novelty Forest</span>
                      <strong className="text-amber">81.3%</strong>
                    </div>
                    <div className="verdict-metric-cell">
                      <span>Mule Graph</span>
                      <strong className="text-crimson">74.0%</strong>
                    </div>
                    <div className="verdict-metric-cell">
                      <span>FPR Drag</span>
                      <strong className="text-cyan">0.00%</strong>
                    </div>
                  </div>

                  <p className="verdict-summary-p">
                    Triggered Hard Policy: <code>NARRATION_POLARITY_CONTRADICTION</code>. Outgoing <code>COLLECT</code> debit masquerading as inbound refund credit.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="packet-modal-footer">
          <button
            type="button"
            className="btn-replay-packet"
            onClick={startSimulation}
            disabled={isRunning}
          >
            <RotateCw size={14} className={isRunning ? "spin-anim" : ""} />
            <span>Replay Packet Transfer</span>
          </button>
          <button type="button" className="btn-close-footer" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

function PacketRow({ fieldKey, data }: { fieldKey: string; data: PacketFieldInfo }) {
  return (
    <div className={`packet-field-row ${data.hot ? "field-hot" : ""}`}>
      <span className="field-name">{fieldKey}</span>
      <div className="field-val-container">
        <span className="field-value">{data.val}</span>
        {data.label && <span className="field-anomaly-note">{data.label}</span>}
      </div>
    </div>
  );
}
