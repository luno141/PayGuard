"""Lightweight, resilient ML serving adapter conforming to SERVING_CONTRACT.md.

Produces transaction_risk, anomaly_risk, mule_risk (0.0 to 1.0),
model_version, and status='READY'.
Seamlessly connects to trained scikit-learn, LightGBM, and Isolation Forest
artifacts from models/models/ via PayGuardPredictor, with smooth fallback to calibrated heuristics.
"""

from __future__ import annotations

import os
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Mapping

import numpy as np

REFUND_WORDS = re.compile(r"\b(refund|cashback|cash back|prize|reward|lottery|kyc)\b", re.IGNORECASE)

# Singleton predictor instance
_PREDICTOR: Any = None
_LOAD_ATTEMPTED = False


def _get_predictor() -> Any:
    global _PREDICTOR, _LOAD_ATTEMPTED
    if _LOAD_ATTEMPTED:
        return _PREDICTOR
    _LOAD_ATTEMPTED = True

    try:
        from models.predictor import PayGuardPredictor
        models_dir = Path("models/models")
        if not models_dir.exists():
            models_dir = Path("../models/models")
        if models_dir.exists():
            _PREDICTOR = PayGuardPredictor(models_dir=str(models_dir))
    except Exception as exc:
        print(f"Notice: Live ML models not loaded into serving adapter ({exc}). Falling back to calibrated heuristics.")
        _PREDICTOR = None

    return _PREDICTOR


def score_models(record: Mapping[str, Any]) -> dict[str, Any]:
    """Score incoming transaction record per SERVING_CONTRACT.md."""
    amount = float(record.get("amount", 0.0))
    direction = str(record.get("direction", "DEBIT")).upper()
    payee = record.get("payee") or {}
    context = record.get("context") or {}
    device = record.get("device") or {}
    network = record.get("network") or {}

    request_type = str(context.get("request_type", "PAY")).upper()
    narration = str(context.get("narration", ""))
    first_seen = bool(payee.get("first_seen", False))
    payee_age = float(payee.get("age_days", 365))
    remote_access = bool(device.get("remote_access_app_active", False))
    call_active = bool(device.get("call_in_progress", False))
    time_to_confirm = float(device.get("time_to_confirm_s", 30))

    qr_merchant = str(context.get("qr_merchant_name") or "")
    expected_vpa = str(context.get("expected_merchant_vpa") or "").lower()
    actual_vpa = str(payee.get("vpa") or "").lower()
    actual_name = str(payee.get("display_name") or "")

    predictor = _get_predictor()

    if predictor is not None:
        try:
            # Map ScoreRequest schema fields to predictor PaySim & behavioural feature schema
            old_balance = max(amount * 1.5, 25000.0)
            new_balance = max(0.0, old_balance - amount)

            is_mismatch_detected = False
            if request_type == "QR":
                if expected_vpa and actual_vpa and expected_vpa != actual_vpa:
                    is_mismatch_detected = True
                elif qr_merchant and actual_name:
                    sim = SequenceMatcher(
                        None,
                        re.sub(r"[^a-z0-9]", "", qr_merchant.lower()),
                        re.sub(r"[^a-z0-9]", "", actual_name.lower()),
                    ).ratio()
                    if sim < 0.72:
                        is_mismatch_detected = True

            txn_payload = {
                "amount_inr": amount,
                "old_balance_orig": old_balance,
                "new_balance_orig": new_balance,
                "old_balance_dest": 0.0,
                "new_balance_dest": amount,
                "expected_merchant": qr_merchant or expected_vpa,
                "actual_beneficiary": actual_vpa or actual_name,
                "is_new_payee": 1 if first_seen else 0,
                "payee_txn_count_30d": 0 if first_seen else int(min(50, payee_age / 10)),
                "device_risk_signal": 1 if (remote_access or call_active) else 0,
                "message_text": narration,
            }

            # Graph topology features if available
            if network:
                senders_24h = float(network.get("payee_distinct_senders_24h", 0))
                forward_ratio = float(network.get("forwarded_value_ratio_1h", 0.0))
                txn_payload.update({
                    "receiver_in_degree": senders_24h,
                    "receiver_in_out_ratio": forward_ratio * 10.0,
                })

            pred = predictor.predict(txn_payload)
            breakdown = pred.get("breakdown", {})

            # 1. Transaction Risk: Blend of LightGBM & Random Forest probabilities
            lgbm_score = float(breakdown.get("lightgbm_score", 0.0))
            rf_score = float(breakdown.get("random_forest_score", 0.0))
            t_risk = 0.55 * lgbm_score + 0.45 * rf_score

            # Account for high-precision domain signals
            if request_type == "COLLECT" and direction == "DEBIT" and bool(REFUND_WORDS.search(narration)):
                t_risk = max(t_risk, 0.85)
            elif is_mismatch_detected:
                t_risk = max(t_risk, 0.70)
            elif remote_access:
                t_risk = max(t_risk, 0.75)

            # 2. Anomaly Risk: Calibrated Isolation Forest anomaly score normalized to [0, 1]
            raw_anomaly = float(breakdown.get("anomaly_score", 0.0))
            iso_threshold = float(predictor.thresholds.get("isolation_forest_threshold", 0.062))
            # Normalize so scores around threshold map smoothly
            if raw_anomaly <= 0:
                a_risk = max(0.02, min(0.15, 0.08 + raw_anomaly * 0.1))
            else:
                a_risk = min(0.98, 0.20 + (raw_anomaly / (iso_threshold * 4.0)) * 0.70)

            # 3. Mule Risk: Graph logistic regression model probability
            m_risk = float(breakdown.get("graph_model_score", 0.0))
            if network:
                senders_24h = float(network.get("payee_distinct_senders_24h", 0))
                forward_ratio = float(network.get("forwarded_value_ratio_1h", 0.0))
                median_delay = float(network.get("median_forward_delay_min", 9999))
                if senders_24h >= 12 and forward_ratio >= 0.70 and median_delay <= 30:
                    m_risk = max(m_risk, 0.90)

            return {
                "transaction_risk": max(0.0, min(1.0, round(t_risk, 4))),
                "anomaly_risk": max(0.0, min(1.0, round(a_risk, 4))),
                "mule_risk": max(0.0, min(1.0, round(m_risk, 4))),
                "model_version": "v1.2-lightgbm-rf-iso-graph",
                "status": "READY",
            }
        except Exception as exc:
            print(f"Error during live model inference ({exc}), falling back to heuristic scoring.")

    # Fallback heuristic calculation if models are unavailable
    t_score = 0.05
    has_refund_word = bool(REFUND_WORDS.search(narration))

    if request_type == "COLLECT" and direction == "DEBIT":
        t_score += 0.35
        if has_refund_word:
            t_score += 0.50

    if request_type == "QR":
        if expected_vpa and expected_vpa != actual_vpa:
            t_score += 0.70
        elif qr_merchant:
            sim = SequenceMatcher(
                None,
                re.sub(r"[^a-z0-9]", "", qr_merchant.lower()),
                re.sub(r"[^a-z0-9]", "", actual_name.lower()),
            ).ratio()
            if sim < 0.70:
                t_score += 0.65

    if remote_access:
        t_score += 0.60
    if call_active and has_refund_word:
        t_score += 0.25
    if first_seen and payee_age < 7:
        t_score += 0.10
    if amount > 15000:
        t_score += 0.05

    t_risk = max(0.0, min(1.0, round(t_score, 4)))

    a_score = 0.08
    if time_to_confirm < 10 or time_to_confirm > 120:
        a_score += 0.25
    if amount > 25000:
        a_score += 0.20
    if first_seen and payee_age < 5:
        a_score += 0.15
    if remote_access or call_active:
        a_score += 0.30
    if device.get("new_device"):
        a_score += 0.15

    a_risk = max(0.0, min(1.0, round(a_score, 4)))

    m_score = 0.02
    senders_24h = float(network.get("payee_distinct_senders_24h", 0))
    forward_ratio = float(network.get("forwarded_value_ratio_1h", 0.0))
    median_delay = float(network.get("median_forward_delay_min", 9999))
    net_age = float(network.get("account_age_days", payee_age))

    if senders_24h >= 10:
        m_score += min(0.40, (senders_24h / 40.0) * 0.40)
    if forward_ratio >= 0.70:
        m_score += 0.35
    if median_delay <= 30:
        m_score += 0.25
    if net_age < 30:
        m_score += 0.10

    m_risk = max(0.0, min(1.0, round(m_score, 4)))

    return {
        "transaction_risk": t_risk,
        "anomaly_risk": a_risk,
        "mule_risk": m_risk,
        "model_version": "v1-hybrid",
        "status": "READY",
    }
