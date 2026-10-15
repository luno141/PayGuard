# 07. Implementation Decisions

## Scope
The prototype demonstrates exactly three trained fraud scenarios:

1. `fake_refund_collect` — a refund/cashback message contradicts an outgoing
   collect request.
2. `qr_beneficiary_mismatch` — a trusted merchant identity differs from the
   beneficiary resolved from a simulated QR payment URI.
3. `mule_account` — an account receives from many distinct sources and forwards
   funds unusually quickly.

A fourth `unseen_registration_fee` pattern exists only in a hold-out set. It is
excluded from supervised training and validates the anomaly/adaptivity flow.

## Three-model contract

| Component | Model | Training population | Output |
|---|---|---|---|
| Transaction risk | HistGradientBoostingClassifier | labelled transaction rows | calibrated fraud probability |
| Novelty | IsolationForest | legitimate training rows only | normalized anomaly score |
| Mule network | HistGradientBoostingClassifier | labelled account snapshots | mule-account probability |

NetworkX calculates the network features for the third model; it is a graph
analysis library, not the model itself. The model consumes only information
available before the payment decision. It must not use future transfers.

## Serving policy

The API transforms incoming requests through the same feature modules used in
training. It combines the three model outputs and explicit context evidence into
a 0–100 risk score. Validation data alone selects the decision thresholds. A
WARN or HIGH_RISK response must include at least one plain-language reason.

Until the third model artifact is available, the API also uses supplied,
pre-payment account-flow evidence as an explicit mule rule: high distinct-sender
count, rapid forwarding, and high forwarded-value ratio. This is shown as a
rule-based network signal, never as a trained model score.

## Data policy

All users, merchants, VPAs, transactions, message text, QR payment URIs and
account graphs are fictional. The synthetic generator is seeded, records its
configuration, and creates overlapping legitimate and fraudulent behaviour.
No live UPI payment, bank API, customer account, or real personal data is used.
