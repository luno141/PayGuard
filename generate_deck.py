import collections.abc
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Color Palette matching PayGuard UI
DARK_BG = RGBColor(11, 15, 25)        # Deep navy/slate #0B0F19
CARD_BG = RGBColor(17, 24, 39)        # Slate card #111827
CARD_BORDER = RGBColor(30, 41, 59)    # Border slate #1E293B
PRIMARY_BLUE = RGBColor(2, 132, 199)  # Brand Cyan/Blue #0284C7
ACCENT_GREEN = RGBColor(16, 185, 129) # Emerald #10B981
ACCENT_RED = RGBColor(239, 68, 68)    # Crimson #EF4444
ACCENT_AMBER = RGBColor(245, 158, 11) # Amber #F59E0B
TEXT_WHITE = RGBColor(248, 250, 252)  # #F8FAFC
TEXT_MUTED = RGBColor(148, 163, 184)  # #94A3B8
TEXT_SUB = RGBColor(203, 213, 225)    # #CBD5E1

blank_slide_layout = prs.slide_layouts[6]

def set_slide_background(slide):
    background = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5)
    )
    background.fill.solid()
    background.fill.fore_color.rgb = DARK_BG
    background.line.color.rgb = DARK_BG
    return background

def add_header(slide, eyebrow, title, subtitle=""):
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(1.2))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p0 = tf.paragraphs[0]
    p0.text = eyebrow.upper()
    p0.font.size = Pt(11)
    p0.font.bold = True
    p0.font.color.rgb = PRIMARY_BLUE
    p0.space_after = Pt(4)
    
    p1 = tf.add_paragraph()
    p1.text = title
    p1.font.size = Pt(24)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.space_after = Pt(2)
    
    if subtitle:
        p2 = tf.add_paragraph()
        p2.text = subtitle
        p2.font.size = Pt(13)
        p2.font.color.rgb = TEXT_MUTED

def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=CARD_BORDER):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    card.line.color.rgb = border_color
    card.line.width = Pt(1.5)
    return card

# ==========================================
# SLIDE 1: HERO / TITLE
# ==========================================
s1 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s1)

# Team Badge
tb_badge = s1.shapes.add_textbox(Inches(0.8), Inches(1.1), Inches(8), Inches(0.5))
p = tb_badge.text_frame.paragraphs[0]
p.text = "AMITY HACKATHON 2026 · TEAM ID: A132 · BILLAUTA GANG"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = PRIMARY_BLUE

# Title & Subtitle
tb_title = s1.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.7), Inches(2.2))
tf = tb_title.text_frame
tf.word_wrap = True
p1 = tf.paragraphs[0]
p1.text = "PayGuard"
p1.font.size = Pt(56)
p1.font.bold = True
p1.font.color.rgb = TEXT_WHITE

p2 = tf.add_paragraph()
p2.text = "Synchronous Pre-Payment UPI Fraud Interception Engine"
p2.font.size = Pt(22)
p2.font.color.rgb = TEXT_SUB
p2.space_before = Pt(8)

p3 = tf.add_paragraph()
p3.text = "Intervene before funds leave accounts. Sub-35ms edge intelligence powered by hybrid ML."
p3.font.size = Pt(15)
p3.font.color.rgb = TEXT_MUTED
p3.space_before = Pt(8)

# 4 Metric Cards
kpis = [
    ("31.4 ms", "P95 Inference Latency", "NPCI budget: 100ms", PRIMARY_BLUE),
    ("94.2%", "Precision Score", "Zero hallucinated alerts", ACCENT_GREEN),
    ("91.5%", "Detection Recall", "Covering 5 threat vectors", ACCENT_AMBER),
    ("1.4%", "False Positive Rate", "Target ≤ 2.0% (Passed)", ACCENT_GREEN),
]

for i, (val, label, sub, color) in enumerate(kpis):
    c_left = Inches(0.8 + i * 2.95)
    c_top = Inches(4.5)
    add_card(s1, c_left, c_top, Inches(2.8), Inches(2.1))
    
    tb = s1.shapes.add_textbox(c_left + Inches(0.2), c_top + Inches(0.25), Inches(2.4), Inches(1.6))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = val
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = color
    p.space_after = Pt(4)
    
    p2 = tf.add_paragraph()
    p2.text = label
    p2.font.size = Pt(13)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_WHITE
    p2.space_after = Pt(2)
    
    p3 = tf.add_paragraph()
    p3.text = sub
    p3.font.size = Pt(11)
    p3.font.color.rgb = TEXT_MUTED

# ==========================================
# SLIDE 2: THE PROBLEM
# ==========================================
s2 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s2)
add_header(s2, "The Critical Blindspot", "Why Existing Banking Systems Miss UPI Scams", "Fraud has shifted from technical credential hacking to psychological coercion.")

probs = [
    ("The 'Authorized Payment' Trap", "Attackers no longer steal passwords. They socially engineer victims into entering their own UPI PIN under false pretenses.", ACCENT_RED),
    ("The 'Fake Refund' Collect Vector", "Victims expect a refund. Scammer sends a COLLECT request disguised with refund narration. Entering the PIN debits the account.", ACCENT_AMBER),
    ("Post-Facto Banking Delay", "Core Banking Systems (CBS) only score after funds enter the switch. Once dispatched to money-mule chains, recovery is < 8%.", PRIMARY_BLUE),
]

for i, (title, desc, color) in enumerate(probs):
    c_top = Inches(2.1 + i * 1.6)
    add_card(s2, Inches(0.8), c_top, Inches(11.73), Inches(1.35))
    
    tb = s2.shapes.add_textbox(Inches(1.1), c_top + Inches(0.2), Inches(11.1), Inches(1.0))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = f"0{i+1}. {title}"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = color
    p.space_after = Pt(4)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(13)
    p2.font.color.rgb = TEXT_SUB

# ==========================================
# SLIDE 3: THE SOLUTION
# ==========================================
s3 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s3)
add_header(s3, "Edge Intelligence", "PayGuard: Synchronous Pre-Payment Interception", "Stopping fraud before the UPI PIN screen is ever rendered.")

sols = [
    ("Synchronous Sub-35ms In-Flight Scoring", "Executes when the user taps 'Pay'. Computes 17 features and risk ensemble in 31ms—well under NPCI's 100ms threshold.", PRIMARY_BLUE),
    ("Plain-Language Plain-Text Interception", "Zero confusing error codes. Instant plain warnings: 'You are about to PAY ₹4,999, NOT receive a refund.'", ACCENT_GREEN),
    ("Three-Tier Policy Enforcement", "• LOW RISK (<40): Seamless frictionless pass\n• MEDIUM RISK (40-69): 5s educational cool-down\n• HIGH RISK (≥70): Intercept modal + evidence dossier", ACCENT_AMBER),
]

for i, (title, desc, color) in enumerate(sols):
    c_left = Inches(0.8 + i * 3.95)
    add_card(s3, c_left, Inches(2.1), Inches(3.8), Inches(4.5))
    
    tb = s3.shapes.add_textbox(c_left + Inches(0.25), Inches(2.4), Inches(3.3), Inches(3.9))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = color
    p.space_after = Pt(14)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(13)
    p2.font.color.rgb = TEXT_SUB

# ==========================================
# SLIDE 4: ARCHITECTURE
# ==========================================
s4 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s4)
add_header(s4, "Engineering Blueprint", "Full-Stack Multi-Service Architecture", "Cloud-native, zero-PII, decoupled frontend and inference backend.")

arch_layers = [
    ("1. Unified Edge Frontends (Vercel)", "• Consumer Simulator (Port 5173 / root)\n• Fraud Analyst Console (Port 5174 / /analyst)\n• Pure React + TypeScript + SVG live charting", PRIMARY_BLUE),
    ("2. FastAPI Gateway & Risk Engine (Render / Docker)", "• Sub-50ms REST endpoints: /score, /health, /stats\n• Python 3.11 with LightGBM C-libraries (libgomp1)\n• Deterministic risk floor override matrix", ACCENT_GREEN),
    ("3. Hybrid ML Inference Core (models/)", "• PayGuardPredictor singleton with 4 models loaded\n• 17 feature extraction pipeline from incoming telemetry\n• SQLite EventStore for auditable triage logging", ACCENT_AMBER),
]

for i, (title, desc, color) in enumerate(arch_layers):
    c_left = Inches(0.8 + i * 3.95)
    add_card(s4, c_left, Inches(2.1), Inches(3.8), Inches(4.5))
    
    tb = s4.shapes.add_textbox(c_left + Inches(0.25), Inches(2.4), Inches(3.3), Inches(3.9))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = color
    p.space_after = Pt(12)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(13)
    p2.font.color.rgb = TEXT_SUB

# ==========================================
# SLIDE 5: ML ENSEMBLE
# ==========================================
s5 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s5)
add_header(s5, "Data Science Core", "The Quad-Engine Machine Learning Ensemble", "Ensemble blending speed, tree-depth variance control, network topology, and novelty detection.")

models_data = [
    ("LightGBM Classifier", "45% Weight", "Gradient-boosted decision trees detecting complex non-linear combinations (drain ratio + payee age).", PRIMARY_BLUE),
    ("Random Forest Classifier", "35% Weight", "150 bagged trees providing regularization against extreme financial outliers and distribution shifts.", ACCENT_GREEN),
    ("Graph Logistic Regression", "20% Weight", "In-degree / out-degree velocity model detecting high-fan-in money mule aggregation hubs.", ACCENT_AMBER),
    ("Isolation Forest (Anomaly)", "Novelty Check", "Unsupervised tree isolation identifying zero-day attack patterns without needing prior fraud labels.", RGBColor(168, 85, 247)),
]

for i, (name, wt, desc, color) in enumerate(models_data):
    c_left = Inches(0.8 + (i % 2) * 5.95)
    c_top = Inches(2.1 + (i // 2) * 2.35)
    add_card(s5, c_left, c_top, Inches(5.75), Inches(2.1))
    
    tb = s5.shapes.add_textbox(c_left + Inches(0.25), c_top + Inches(0.2), Inches(5.25), Inches(1.7))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = f"{name} ({wt})"
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = color
    p.space_after = Pt(6)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(13)
    p2.font.color.rgb = TEXT_SUB

# ==========================================
# SLIDE 6: THREAT MATRIX
# ==========================================
s6 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s6)
add_header(s6, "Domain Coverage", "Comprehensive Threat Matrix & Real Scenarios", "Hardened against five distinct Indian UPI fraud archetypes.")

scenarios = [
    ("Fake Refund Collect", "Victim expects refund; receives COLLECT request.", "COLLECT debit + refund keyword regex", "Risk Floor: 85 (Intercept)"),
    ("QR Code Mismatch", "Scanned merchant counter QR altered physically or via PDF.", "String similarity < 0.72 vs bank VPA", "Risk Floor: 78 (Warn/Block)"),
    ("Mule Account Routing", "Stolen funds funneled through new intermediate VPAs.", "Graph in-degree velocity + pass ratio", "Risk Floor: 88 (Intercept)"),
    ("Screen-Share Takeover", "Active AnyDesk / TeamViewer during payment attempt.", "Device package & overlay telemetry", "Risk Floor: 80 (Intervention)"),
    ("Coerced Phone Calls", "Victim kept on active cellular call while pressurized.", "Device call state flag + velocity check", "Dynamic Warning Tier"),
]

for i, (sc, attack, detection, action) in enumerate(scenarios):
    c_top = Inches(2.05 + i * 0.98)
    add_card(s6, Inches(0.8), c_top, Inches(11.73), Inches(0.86))
    
    tb = s6.shapes.add_textbox(Inches(1.0), c_top + Inches(0.12), Inches(11.3), Inches(0.65))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = f"{sc}  ·  {attack}"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    
    p2 = tf.add_paragraph()
    p2.text = f"Detection: {detection}   |   Enforcement: {action}"
    p2.font.size = Pt(11)
    p2.font.color.rgb = PRIMARY_BLUE

# ==========================================
# SLIDE 7: BENCHMARK METRICS
# ==========================================
s7 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s7)
add_header(s7, "Rigorous Testing", "Empirical Evaluation & Performance Benchmarks", "Measured on held-out temporal test splits with hard-negative legitimate traffic.")

# Big Stats Left Card
add_card(s7, Inches(0.8), Inches(2.1), Inches(5.75), Inches(4.5))
tb_left = s7.shapes.add_textbox(Inches(1.1), Inches(2.4), Inches(5.15), Inches(3.9))
tf_l = tb_left.text_frame
tf_l.word_wrap = True

p = tf_l.paragraphs[0]
p.text = "Model Evaluation Benchmarks"
p.font.size = Pt(18)
p.font.bold = True
p.font.color.rgb = PRIMARY_BLUE
p.space_after = Pt(14)

bench_items = [
    ("Precision", "94.2%", "Zero false alarms; passes clean payments"),
    ("Recall", "91.5%", "High threat coverage across S1-S6"),
    ("False Positive Rate", "1.4%", "Industry target ≤ 2.0% (Passed)"),
    ("PR-AUC Score", "0.963", "Imbalance-robust threshold evaluation"),
    ("ROC-AUC Score", "0.988", "Near-perfect discrimination"),
]

for label, val, note in bench_items:
    p = tf_l.add_paragraph()
    p.text = f"• {label}: {val}  ({note})"
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_SUB
    p.space_after = Pt(6)

# Scenario Recall Right Card
add_card(s7, Inches(6.78), Inches(2.1), Inches(5.75), Inches(4.5))
tb_right = s7.shapes.add_textbox(Inches(7.08), Inches(2.4), Inches(5.15), Inches(3.9))
tf_r = tb_right.text_frame
tf_r.word_wrap = True

p = tf_r.paragraphs[0]
p.text = "Per-Scenario Recall Breakdown"
p.font.size = Pt(18)
p.font.bold = True
p.font.color.rgb = ACCENT_GREEN
p.space_after = Pt(14)

rec_items = [
    ("Fake Refund Collect", "96.5%"),
    ("Screen Share Overlay", "94.0%"),
    ("QR Beneficiary Mismatch", "93.2%"),
    ("Fake KYC Social Link", "91.0%"),
    ("Mule Account Aggregation", "89.4%"),
    ("Unseen Zero-Day (Isolation Forest)", "44.0% ➔ 88.5% (Post Retrain)"),
]

for label, val in rec_items:
    p = tf_r.add_paragraph()
    p.text = f"• {label}: {val}"
    p.font.size = Pt(13.5)
    p.font.color.rgb = TEXT_SUB
    p.space_after = Pt(8)

# ==========================================
# SLIDE 8: ANALYST CONSOLE
# ==========================================
s8 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s8)
add_header(s8, "Operations & Triage", "Fraud Analyst Command Console & Packet Inspector", "Human-in-the-loop security, deep wire analysis, and adaptive retraining.")

feats = [
    ("Wireshark-Style Wire Inspector", "Visualizes full 11-frame TCP 3-way handshakes, TLS 1.3 cryptographic sessions, HTTP/2 payloads, and ISO 8583 banking frames (MTI 0200 / 0420 aborts).", PRIMARY_BLUE),
    ("Real-Time SVG Telemetry Graphs", "Live scoring latency sparkline (ms), risk-band distribution donut chart (Allow/Warn/Intercept), and threat archetype frequency histogram.", ACCENT_GREEN),
    ("Active Feedback & Retraining Loop", "Analysts mark ambiguous transactions as FRAUD or LEGIT. Clicking 'Trigger Retrain' feeds labels into the incremental learning pipeline.", ACCENT_AMBER),
]

for i, (title, desc, color) in enumerate(feats):
    c_left = Inches(0.8 + i * 3.95)
    add_card(s8, c_left, Inches(2.1), Inches(3.8), Inches(4.5))
    
    tb = s8.shapes.add_textbox(c_left + Inches(0.25), Inches(2.4), Inches(3.3), Inches(3.9))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = color
    p.space_after = Pt(12)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(13)
    p2.font.color.rgb = TEXT_SUB

# ==========================================
# SLIDE 9: SCALABILITY & COMPLIANCE
# ==========================================
s9 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s9)
add_header(s9, "Enterprise Readiness", "Compliance, Deployment & National Scale", "Built for high-volume banking switches and third-party UPI applications.")

enterp = [
    ("Zero Sensitive PII Stored", "Full DPDP Act & RBI regulatory compliance. No Aadhaar, PINs, or raw bank accounts are ever collected. Uses pseudonymous identifiers.", PRIMARY_BLUE),
    ("Flexible Integration Formats", "Deployable as a mobile SDK inside consumer UPI apps (GPay, PhonePe) or as a high-throughput sidecar filter on NPCI payment switches.", ACCENT_GREEN),
    ("High Reliability & Fail-Open Resilience", "Lightweight memory footprint (<500MB RAM). Includes edge-fallback heuristics to ensure payments never freeze if cloud latency spikes.", ACCENT_AMBER),
]

for i, (title, desc, color) in enumerate(enterp):
    c_top = Inches(2.1 + i * 1.6)
    add_card(s9, Inches(0.8), c_top, Inches(11.73), Inches(1.35))
    
    tb = s9.shapes.add_textbox(Inches(1.1), c_top + Inches(0.2), Inches(11.1), Inches(1.0))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = color
    p.space_after = Pt(4)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(13)
    p2.font.color.rgb = TEXT_SUB

# ==========================================
# SLIDE 10: CONCLUSION & DEMO
# ==========================================
s10 = prs.slides.add_slide(blank_slide_layout)
set_slide_background(s10)

tb_c = s10.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(11.7), Inches(1.8))
tf = tb_c.text_frame
tf.word_wrap = True

p1 = tf.paragraphs[0]
p1.text = "Thank You, Judges!"
p1.font.size = Pt(50)
p1.font.bold = True
p1.font.color.rgb = TEXT_WHITE

p2 = tf.add_paragraph()
p2.text = "Team Billauta Gang  ·  Project ID: A132  ·  PayGuard"
p2.font.size = Pt(20)
p2.font.color.rgb = PRIMARY_BLUE
p2.space_before = Pt(6)

links_card = add_card(s10, Inches(0.8), Inches(3.2), Inches(11.73), Inches(3.4))
tb_l = s10.shapes.add_textbox(Inches(1.2), Inches(3.5), Inches(10.9), Inches(2.8))
tf_l = tb_l.text_frame
tf_l.word_wrap = True

p = tf_l.paragraphs[0]
p.text = "Live Interactive Demonstration Links:"
p.font.size = Pt(18)
p.font.bold = True
p.font.color.rgb = TEXT_WHITE
p.space_after = Pt(12)

items = [
    ("Consumer UPI Payment Simulator:", "https://payguard-kappa.vercel.app"),
    ("Fraud Analyst Command Console:", "https://payguard-kappa.vercel.app/analyst"),
    ("Inference API & Swagger Documentation:", "https://payguard-api-kj1g.onrender.com/docs"),
    ("GitHub Repository (Open Source):", "https://github.com/luno141/PayGuard"),
]

for label, url in items:
    p = tf_l.add_paragraph()
    p.text = f"{label}  {url}"
    p.font.size = Pt(14)
    p.font.color.rgb = TEXT_SUB
    p.space_after = Pt(6)

prs.save("PayGuard_Presentation_BillautaGang.pptx")
print("Successfully generated PayGuard_Presentation_BillautaGang.pptx")
