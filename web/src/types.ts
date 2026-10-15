export type Decision = "ALLOW" | "WARN" | "HIGH_RISK";

export type ScoreRequest = {
  txn_id: string;
  user_id: string;
  timestamp: string;
  amount: number;
  direction: "DEBIT" | "CREDIT";
  payee: { vpa: string; display_name: string; first_seen: boolean; age_days: number };
  context: {
    request_type: "PAY" | "COLLECT" | "QR" | "LINK";
    narration: string;
    qr_merchant_name?: string;
    expected_merchant_vpa?: string;
    link_risk?: number;
  };
  device?: { new_device: boolean; remote_access_app_active: boolean; call_in_progress: boolean; time_to_confirm_s: number };
  network?: { payee_distinct_senders_24h: number; forwarded_value_ratio_1h: number; median_forward_delay_min: number; account_age_days: number };
};

export type ScoreResponse = {
  txn_id: string;
  risk: number;
  decision: Decision;
  scenario: string | null;
  headline: string;
  reasons: { code: string; message: string }[];
  model_scores: { transaction_risk: number | null; anomaly_risk: number | null; mule_risk: number | null; status: string };
  model_version: string;
  latency_ms: number;
  created_at?: string;
  feedback?: "FRAUD" | "LEGIT" | null;
  request?: ScoreRequest | null;
};

export type DashboardStats = { transactions_scored: number; flagged_transactions: number; feedback_count: number };

export type EvaluationMetrics = {
  precision: number;
  recall: number;
  f1_score: number;
  fpr: number;
  pr_auc: number;
  roc_auc: number;
  p95_latency_ms: number;
  scenario_recall: Record<string, number>;
  unseen_s7_pre_feedback_recall: number;
  unseen_s7_post_feedback_recall: number;
  model_version: string;
};
