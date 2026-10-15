import os
import json
import numpy as np
import joblib

class PayGuardPredictor:
    """
    Self-contained inference engine for PayGuard fraud detection.
    Can be imported directly into FastAPI, Flask, Django, or invoked via CLI.
    """

    REFUND_KEYWORDS = ['refund', 'cashback', 'reward', 'lottery', 'bonus', 'voucher', 'claim', 'reimbursement']
    ACTION_KEYWORDS = ['approve', 'pin', 'authorize', 'urgent', 'collect', 'deposit', 'clearance', 'settlement']

    def __init__(self, models_dir=None):
        if models_dir is None:
            # Default to the directory where this predictor.py lives
            models_dir = os.path.dirname(os.path.abspath(__file__))
            if not os.path.exists(os.path.join(models_dir, 'supervised_rf.joblib')):
                nested = os.path.join(models_dir, 'models')
                if os.path.exists(nested):
                    models_dir = nested

        self.models_dir = str(models_dir)
        self._load_models()

    def _load_models(self):
        # 1. Supervised models
        self.rf = joblib.load(os.path.join(self.models_dir, 'supervised_rf.joblib'))
        self.lgbm = joblib.load(os.path.join(self.models_dir, 'supervised_lgbm.joblib'))
        
        # 2. Anomaly detector
        self.iso = joblib.load(os.path.join(self.models_dir, 'isolation_forest.joblib'))
        
        # 3. Graph model & scaler
        self.graph_model = joblib.load(os.path.join(self.models_dir, 'graph_logreg.joblib'))
        self.graph_scaler = joblib.load(os.path.join(self.models_dir, 'graph_scaler.joblib'))

        # 4. Calibrated operating thresholds
        thresholds_path = os.path.join(self.models_dir, 'thresholds.json')
        if os.path.exists(thresholds_path):
            with open(thresholds_path, 'r') as f:
                self.thresholds = json.load(f)
        else:
            self.thresholds = {
                'rf_threshold': 0.36,
                'lgbm_threshold': 0.28,
                'isolation_forest_threshold': 0.06,
                'graph_logreg_threshold': 0.90
            }

    def extract_features(self, txn):
        """
        Extracts the 17 core PaySim & behavioral features from a transaction dict.
        """
        amount = float(txn.get('amount_inr', 0.0))
        log_amount = np.log1p(amount)
        old_bal_orig = float(txn.get('old_balance_orig', max(amount, 1000.0)))
        new_bal_orig = float(txn.get('new_balance_orig', max(0.0, old_bal_orig - amount)))
        old_bal_dest = float(txn.get('old_balance_dest', 0.0))
        new_bal_dest = float(txn.get('new_balance_dest', old_bal_dest + amount))

        balance_drain_ratio = float(np.clip(amount / (old_bal_orig + 1.0), 0.0, 1.0))
        orig_drained_to_zero = 1.0 if new_bal_orig < 1.0 else 0.0
        dest_zero_start = 1.0 if old_bal_dest < 1.0 else 0.0

        expected_m = str(txn.get('expected_merchant', '')).strip()
        actual_b = str(txn.get('actual_beneficiary', expected_m)).strip()
        is_mismatch = 1.0 if expected_m and actual_b and expected_m != actual_b else 0.0

        is_new_payee = float(txn.get('is_new_payee', 0))
        payee_txn_count = float(txn.get('payee_txn_count_30d', 10 if is_new_payee == 0 else 0))
        zero_history = 1.0 if payee_txn_count == 0.0 else 0.0
        device_risk = float(txn.get('device_risk_signal', 0))

        msg = str(txn.get('message_text', '')).lower()
        has_refund_kw = 1.0 if any(k in msg for k in self.REFUND_KEYWORDS) else 0.0
        has_action_kw = 1.0 if any(k in msg for k in self.ACTION_KEYWORDS) else 0.0
        msg_len = float(len(msg))

        drain_new_payee = balance_drain_ratio * is_new_payee
        drain_device_risk = balance_drain_ratio * device_risk
        mismatch_new_payee = is_mismatch * is_new_payee
        device_risk_new_payee = device_risk * is_new_payee

        base_vector = np.array([
            amount, log_amount, balance_drain_ratio, orig_drained_to_zero, dest_zero_start,
            is_mismatch, is_new_payee, payee_txn_count, zero_history, device_risk,
            has_refund_kw, has_action_kw, msg_len, drain_new_payee, drain_device_risk,
            mismatch_new_payee, device_risk_new_payee
        ], dtype=float).reshape(1, -1)

        # Graph attributes (sender & receiver metrics if known, else defaults)
        sender_graph = [
            float(txn.get('sender_in_degree', 1)),
            float(txn.get('sender_out_degree', 5)),
            float(txn.get('sender_total_degree', 6)),
            float(txn.get('sender_in_out_ratio', 0.2)),
            amount, 0.0, float(txn.get('sender_pagerank', 0.001))
        ]
        receiver_graph = [
            float(txn.get('receiver_in_degree', 20 if is_new_payee else 5)),
            float(txn.get('receiver_out_degree', 1)),
            float(txn.get('receiver_total_degree', 21)),
            float(txn.get('receiver_in_out_ratio', 10.0 if is_new_payee else 1.0)),
            0.0, amount, float(txn.get('receiver_pagerank', 0.005))
        ]

        graph_vector = np.hstack([base_vector, np.array(sender_graph + receiver_graph).reshape(1, -1)])
        return base_vector, graph_vector

    def predict(self, txn):
        """
        Evaluates a transaction and returns an actionable decision packet.
        """
        base_features, graph_features = self.extract_features(txn)

        # 1. Model scores
        lgbm_prob = float(self.lgbm.predict_proba(base_features)[0, 1])
        rf_prob = float(self.rf.predict_proba(base_features)[0, 1])

        iso_score = float(-self.iso.decision_function(base_features)[0])
        iso_anom = bool(iso_score >= self.thresholds.get('isolation_forest_threshold', 0.062))

        graph_features_scaled = self.graph_scaler.transform(graph_features)
        graph_prob = float(self.graph_model.predict_proba(graph_features_scaled)[0, 1])

        # 2. Ensemble risk score (weighted blend)
        ensemble_score = float(0.45 * lgbm_prob + 0.35 * rf_prob + 0.20 * graph_prob)
        
        # Primary decision based on LightGBM calibrated threshold
        is_fraud = bool(lgbm_prob >= self.thresholds.get('lgbm_threshold', 0.28) or ensemble_score >= 0.40)

        # 3. Explainability / Flags
        flags = []
        if base_features[0, 5] == 1.0:
            flags.append("BENEFICIARY_MISMATCH: Actual recipient differs from expected merchant (Possible QR scam).")
        if base_features[0, 2] >= 0.80:
            flags.append("HIGH_BALANCE_DRAIN: Transfer drains over 80% of account balance (PaySim drain pattern).")
        if base_features[0, 10] == 1.0 and base_features[0, 11] == 1.0:
            flags.append("SCAM_LANGUAGE: Message requests approval/PIN for refund/cashback.")
        if base_features[0, 9] == 1.0 and base_features[0, 6] == 1.0:
            flags.append("DEVICE_RISK: High-risk device paying an unfamiliar first-time recipient.")
        if iso_anom:
            flags.append("STATISTICAL_ANOMALY: Behavioral profile strongly deviates from normal transactions.")
        if graph_prob >= self.thresholds.get('graph_logreg_threshold', 0.90):
            flags.append("NETWORK_RISK: Destination node matches money-mule aggregation topology.")

        status = "DECLINED" if is_fraud else ("FLAGGED_REVIEW" if (iso_anom or ensemble_score > 0.15) else "APPROVED")

        return {
            "status": status,
            "is_fraud": is_fraud,
            "risk_score": round(ensemble_score, 4),
            "flags": flags,
            "breakdown": {
                "lightgbm_score": round(lgbm_prob, 4),
                "random_forest_score": round(rf_prob, 4),
                "graph_model_score": round(graph_prob, 4),
                "anomaly_score": round(iso_score, 4),
                "is_anomaly": iso_anom
            }
        }

if __name__ == "__main__":
    import sys
    predictor = PayGuardPredictor()

    # If JSON is passed via CLI argument or piped into stdin
    input_json = None
    if len(sys.argv) > 1:
        input_json = sys.argv[1]
    elif not sys.stdin.isatty():
        input_json = sys.stdin.read()

    if input_json:
        try:
            txn_input = json.loads(input_json)
            result = predictor.predict(txn_input)
            print(json.dumps(result))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)

    # Otherwise run self-tests
    print("✅ PayGuardPredictor self-test suite:")

    legit_txn = {
        "amount_inr": 450.0,
        "old_balance_orig": 12000.0,
        "new_balance_orig": 11550.0,
        "old_balance_dest": 54000.0,
        "new_balance_dest": 54450.0,
        "expected_merchant": "MERCH_STORE_44",
        "actual_beneficiary": "MERCH_STORE_44",
        "is_new_payee": 0,
        "payee_txn_count_30d": 14,
        "device_risk_signal": 0,
        "message_text": "Weekly grocery purchase"
    }
    res_legit = predictor.predict(legit_txn)
    print("\n--- Test 1: Legitimate Transaction ---")
    print(json.dumps(res_legit, indent=2))

    qr_scam_txn = {
        "amount_inr": 3200.0,
        "old_balance_orig": 8000.0,
        "new_balance_orig": 4800.0,
        "old_balance_dest": 0.0,
        "new_balance_dest": 3200.0,
        "expected_merchant": "STORE_RETAIL_12",
        "actual_beneficiary": "MULE_BEN_ACC0992",
        "is_new_payee": 1,
        "payee_txn_count_30d": 0,
        "device_risk_signal": 1,
        "message_text": "Payment for counter order"
    }
    res_scam = predictor.predict(qr_scam_txn)
    print("\n--- Test 2: QR Mismatch Scam ---")
    print(json.dumps(res_scam, indent=2))
