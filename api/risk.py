"""Combine model evidence and explainable pre-payment context checks."""

from __future__ import annotations

import re
from collections.abc import Mapping
from difflib import SequenceMatcher
from typing import Any

from api.schemas import Decision, Direction, Reason, ScoreRequest

REFUND_WORDS = re.compile(r"\b(refund|cashback|cash back|prize|reward)\b", re.IGNORECASE)


def _name_similarity(left: str, right: str) -> float:
    normalized_left = re.sub(r"[^a-z0-9]", "", left.lower())
    normalized_right = re.sub(r"[^a-z0-9]", "", right.lower())
    return SequenceMatcher(a=normalized_left, b=normalized_right).ratio()


def context_reasons(request: ScoreRequest) -> tuple[list[Reason], str | None, int]:
    """Return reasons, inferred scenario, and a validation-independent risk floor."""
    reasons: list[Reason] = []
    scenario: str | None = None
    floor = 0
    narration_is_refund = bool(REFUND_WORDS.search(request.context.narration))

    if request.context.request_type.value == "COLLECT" and request.direction == Direction.DEBIT:
        reasons.append(
            Reason(
                code="collect_debit",
                message="This collect request will send money from your account.",
            )
        )
        if narration_is_refund:
            scenario, floor = "fake_refund_collect", 85
            reasons.append(
                Reason(
                    code="refund_payment_mismatch",
                    message="The message says refund, but this payment will debit your account.",
                )
            )

    expected_vpa = request.context.expected_merchant_vpa
    merchant_name = request.context.qr_merchant_name
    payee_name = request.payee.display_name
    vpa_mismatch = bool(expected_vpa and expected_vpa.lower() != request.payee.vpa.lower())
    name_mismatch = bool(merchant_name and _name_similarity(merchant_name, payee_name) < 0.72)
    if request.context.request_type.value == "QR" and (vpa_mismatch or name_mismatch):
        scenario, floor = "qr_beneficiary_mismatch", max(floor, 78)
        reasons.append(
            Reason(
                code="qr_beneficiary_mismatch",
                message="The QR beneficiary does not match the merchant you expected to pay.",
            )
        )

    if request.payee.first_seen:
        reasons.append(
            Reason(code="new_payee", message="This is your first payment to this beneficiary.")
        )
    if request.device.remote_access_app_active:
        floor = max(floor, 80)
        reasons.append(
            Reason(
                code="remote_access_active",
                message="A remote-access app is active. Banks never need screen access for a payment.",
            )
        )
    if (
        request.network
        and request.network.payee_distinct_senders_24h >= 12
        and request.network.forwarded_value_ratio_1h >= 0.70
        and request.network.median_forward_delay_min <= 30
    ):
        scenario, floor = "mule_account", max(floor, 88)
        reasons.append(
            Reason(
                code="mule_flow_pattern",
                message="This beneficiary receives from many senders and forwards funds unusually quickly.",
            )
        )
    return reasons, scenario, floor


def assess_risk(request: ScoreRequest, model_result: Mapping[str, Any]) -> dict[str, Any]:
    """Produce one transparent decision from three model scores and rule evidence."""
    reasons, scenario, risk_floor = context_reasons(request)
    score_names = ("transaction_risk", "anomaly_risk", "mule_risk")
    ready = model_result.get("status") == "READY"
    if ready:
        weighted_score = (
            0.50 * float(model_result["transaction_risk"])
            + 0.20 * float(model_result["anomaly_risk"])
            + 0.30 * float(model_result["mule_risk"])
        )
        risk = max(risk_floor, round(weighted_score * 100))
        if float(model_result["mule_risk"]) >= 0.65:
            scenario = scenario or "mule_account"
            reasons.append(
                Reason(
                    code="mule_network_risk",
                    message="This beneficiary shows an unusual pattern of receiving and forwarding funds.",
                )
            )
    else:
        risk = risk_floor

    if risk >= 80:
        decision = Decision.HIGH_RISK
    elif risk >= 55:
        decision = Decision.WARN
    else:
        decision = Decision.ALLOW

    if decision == Decision.HIGH_RISK and scenario == "fake_refund_collect":
        headline = f"You are about to PAY ₹{request.amount:,.0f}, not receive a refund."
    elif decision == Decision.HIGH_RISK and scenario == "qr_beneficiary_mismatch":
        headline = "The QR beneficiary does not match this merchant."
    elif decision == Decision.HIGH_RISK and scenario == "mule_account":
        headline = "This beneficiary has a high-risk money-flow pattern."
    elif decision == Decision.WARN:
        headline = "Check this payment before you continue."
    else:
        headline = "No high-risk signals found."

    if decision != Decision.ALLOW and not reasons:
        reasons.append(Reason(code="model_risk", message="This payment differs from normal activity."))

    return {
        "risk": risk,
        "decision": decision,
        "scenario": scenario,
        "headline": headline,
        "reasons": reasons,
        "model_scores": {
            **{name: model_result.get(name) for name in score_names},
            "status": str(model_result["status"]),
        },
        "model_version": str(model_result["model_version"]),
    }
