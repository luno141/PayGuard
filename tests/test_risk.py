from __future__ import annotations

from api.risk import assess_risk
from api.schemas import ScoreRequest


def make_request(**overrides: object) -> ScoreRequest:
    payload: dict[str, object] = {
        "txn_id": "T-1",
        "user_id": "U-1",
        "timestamp": "2026-10-15T21:40:00+05:30",
        "amount": 5_000,
        "direction": "DEBIT",
        "payee": {"vpa": "refund@upi", "display_name": "Refund Desk", "first_seen": True, "age_days": 2},
        "context": {"request_type": "COLLECT", "narration": "Your refund is ready"},
    }
    payload.update(overrides)
    return ScoreRequest.model_validate(payload)


def test_refund_collect_has_clear_high_risk_warning() -> None:
    result = assess_risk(
        make_request(), {"status": "MODEL_UNAVAILABLE", "model_version": "unavailable"}
    )

    assert result["decision"] == "HIGH_RISK"
    assert result["scenario"] == "fake_refund_collect"
    assert result["risk"] >= 85
    assert any(reason.code == "refund_payment_mismatch" for reason in result["reasons"])


def test_qr_beneficiary_mismatch_is_flagged() -> None:
    request = make_request(
        context={
            "request_type": "QR",
            "narration": "Payment",
            "qr_merchant_name": "Sharma Sweets",
            "expected_merchant_vpa": "sharmasweets@okaxis",
        },
        payee={"vpa": "unknown@ybl", "display_name": "Unknown Demo Account", "first_seen": True, "age_days": 1},
    )
    result = assess_risk(
        request, {"status": "MODEL_UNAVAILABLE", "model_version": "unavailable"}
    )

    assert result["scenario"] == "qr_beneficiary_mismatch"
    assert result["decision"] == "WARN"
    assert any(reason.code == "qr_beneficiary_mismatch" for reason in result["reasons"])


def test_ready_models_add_mule_reason() -> None:
    result = assess_risk(
        make_request(context={"request_type": "PAY", "narration": "Payment"}),
        {
            "status": "READY",
            "model_version": "v1",
            "transaction_risk": 0.20,
            "anomaly_risk": 0.40,
            "mule_risk": 0.90,
        },
    )

    assert result["scenario"] == "mule_account"
    assert any(reason.code == "mule_network_risk" for reason in result["reasons"])


def test_mule_network_rule_flags_high_risk_without_model_artifacts() -> None:
    result = assess_risk(
        make_request(
            context={"request_type": "PAY", "narration": "Registration payment"},
            network={
                "payee_distinct_senders_24h": 35,
                "forwarded_value_ratio_1h": 0.91,
                "median_forward_delay_min": 8,
                "account_age_days": 12,
            },
        ),
        {"status": "MODEL_UNAVAILABLE", "model_version": "unavailable"},
    )

    assert result["decision"] == "HIGH_RISK"
    assert result["scenario"] == "mule_account"
    assert any(reason.code == "mule_flow_pattern" for reason in result["reasons"])
