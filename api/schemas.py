"""Request and response contracts shared by the frontend, API, and ML serving layer."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Direction(StrEnum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class RequestType(StrEnum):
    PAY = "PAY"
    COLLECT = "COLLECT"
    QR = "QR"
    LINK = "LINK"


class Decision(StrEnum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    HIGH_RISK = "HIGH_RISK"


class FeedbackLabel(StrEnum):
    FRAUD = "FRAUD"
    LEGIT = "LEGIT"


class Payee(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    vpa: str = Field(min_length=3, max_length=120)
    display_name: str = Field(min_length=1, max_length=120)
    first_seen: bool
    age_days: int = Field(ge=0, le=10_000)


class PaymentContext(BaseModel):
    request_type: RequestType
    narration: str = Field(default="", max_length=500)
    qr_merchant_name: str | None = Field(default=None, max_length=120)
    expected_merchant_vpa: str | None = Field(default=None, max_length=120)
    link_risk: float = Field(default=0.0, ge=0, le=1)


class DeviceSignals(BaseModel):
    new_device: bool = False
    remote_access_app_active: bool = False
    call_in_progress: bool = False
    time_to_confirm_s: int = Field(default=30, ge=0, le=3_600)


class NetworkSignals(BaseModel):
    payee_distinct_senders_24h: int = Field(ge=0, le=100_000)
    forwarded_value_ratio_1h: float = Field(ge=0, le=1)
    median_forward_delay_min: int = Field(ge=0, le=10_080)
    account_age_days: int = Field(ge=0, le=10_000)


class ScoreRequest(BaseModel):
    txn_id: str = Field(min_length=1, max_length=100)
    user_id: str = Field(min_length=1, max_length=100)
    timestamp: datetime
    amount: float = Field(gt=0, le=10_000_000)
    direction: Direction
    payee: Payee
    context: PaymentContext
    device: DeviceSignals = Field(default_factory=DeviceSignals)
    network: NetworkSignals | None = None


class Reason(BaseModel):
    code: str
    message: str


class ModelScores(BaseModel):
    transaction_risk: float | None = Field(default=None, ge=0, le=1)
    anomaly_risk: float | None = Field(default=None, ge=0, le=1)
    mule_risk: float | None = Field(default=None, ge=0, le=1)
    status: str


class ScoreResponse(BaseModel):
    txn_id: str
    risk: int = Field(ge=0, le=100)
    decision: Decision
    scenario: str | None = None
    headline: str
    reasons: list[Reason]
    model_scores: ModelScores
    model_version: str
    latency_ms: float = Field(ge=0)


class FeedbackRequest(BaseModel):
    txn_id: str
    label: FeedbackLabel


class FeedbackResponse(BaseModel):
    txn_id: str
    label: FeedbackLabel
    stored: bool
