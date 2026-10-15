"""Stable boundary between the API and artifacts produced by the ML pipeline."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


def score_models(record: Mapping[str, Any]) -> dict[str, Any]:
    """Return model outputs or an explicit unavailable status.

    The ML pipeline supplies ``ml.serving.score_models(record)``. It must return
    transaction_risk, anomaly_risk, mule_risk in the inclusive 0-1 range and a
    model_version. The API does not manufacture model scores when artifacts are
    absent; explicit context checks continue to work in rules-only mode.
    """
    try:
        from ml.serving import score_models as trained_model_scores
    except ModuleNotFoundError:
        return {"status": "MODEL_UNAVAILABLE", "model_version": "unavailable"}

    result = dict(trained_model_scores(record))
    required_scores = ("transaction_risk", "anomaly_risk", "mule_risk")
    if any(name not in result for name in required_scores):
        raise ValueError("ml.serving.score_models returned incomplete scores")
    for name in required_scores:
        value = float(result[name])
        if not 0 <= value <= 1:
            raise ValueError(f"{name} must be between 0 and 1")
        result[name] = value
    result.setdefault("status", "READY")
    result.setdefault("model_version", "v1")
    return result
