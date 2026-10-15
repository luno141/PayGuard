# ML Serving Contract

The API imports `ml.serving.score_models(record)` at request time. The model
team should create `ml/serving.py` with this function once artifacts exist.

## Input

`record` is `ScoreRequest.model_dump(mode="json")`: a JSON-compatible mapping
with transaction, payee, context, and device fields. The serving function must
reuse the feature code used at training time; it must not use `label` or
`scenario` as inputs.

## Required response

```python
{
    "transaction_risk": 0.0,  # supervised transaction model, inclusive 0-1
    "anomaly_risk": 0.0,      # Isolation Forest, normalized to inclusive 0-1
    "mule_risk": 0.0,         # account-network model, inclusive 0-1
    "model_version": "v1",
    "status": "READY",
}
```

The API validates all three scores. Do not load model artifacts per request;
load them once at module scope or with a cached loader. The function must only
derive information available before payment confirmation.
