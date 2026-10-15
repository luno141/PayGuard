import type { ScoreRequest } from "./types";

export type DemoScenario = {
  id: string;
  tag: string;
  label: string;
  description: string;
  payload: ScoreRequest;
};

const base = (id: string): Pick<ScoreRequest, "txn_id" | "user_id" | "timestamp" | "direction"> => ({
  txn_id: `${id}-${Date.now().toString(36)}`,
  user_id: "demo-user-1",
  timestamp: new Date().toISOString(),
  direction: "DEBIT",
});

export const demos = (): DemoScenario[] => [
  {
    id: "refund",
    tag: "S1 Fraud",
    label: "Fake refund collect",
    description: "A refund message hides an outgoing collect debit request.",
    payload: {
      ...base("refund"),
      amount: 5000,
      payee: { vpa: "refunddesk@upi", display_name: "Refund Desk", first_seen: true, age_days: 2 },
      context: { request_type: "COLLECT", narration: "Your refund of Rs 5000 is ready. Approve collect request to credit." },
      device: { new_device: false, remote_access_app_active: false, call_in_progress: true, time_to_confirm_s: 8 },
    },
  },
  {
    id: "qr",
    tag: "S2 Fraud",
    label: "QR beneficiary mismatch",
    description: "The intended merchant differs from the beneficiary resolved by the QR code.",
    payload: {
      ...base("qr"),
      amount: 1200,
      payee: { vpa: "quickpay.unknown@ybl", display_name: "Unknown Merchant Co", first_seen: true, age_days: 3 },
      context: {
        request_type: "QR",
        narration: "Payment at Sharma Sweets",
        qr_merchant_name: "Sharma Sweets",
        expected_merchant_vpa: "sharmasweets@okaxis",
      },
      device: { new_device: false, remote_access_app_active: false, call_in_progress: false, time_to_confirm_s: 25 },
    },
  },
  {
    id: "mule",
    tag: "S3 Fraud",
    label: "Mule-account chain",
    description: "Beneficiary has rapid pass-through and a suspicious network of counterparties.",
    payload: {
      ...base("mule"),
      amount: 20000,
      payee: { vpa: "swiftforward@okaxis", display_name: "Rapid Transit Beneficiary", first_seen: true, age_days: 12 },
      context: { request_type: "PAY", narration: "Urgent transfer" },
      device: { new_device: false, remote_access_app_active: false, call_in_progress: false, time_to_confirm_s: 14 },
      network: {
        payee_distinct_senders_24h: 42,
        forwarded_value_ratio_1h: 0.94,
        median_forward_delay_min: 7,
        account_age_days: 14,
      },
    },
  },
  {
    id: "screenshare",
    tag: "S4 Fraud",
    label: "Remote screen-share scam",
    description: "Victim is actively guided through AnyDesk while on a call.",
    payload: {
      ...base("screen"),
      amount: 14500,
      payee: { vpa: "helpdesk.support@oksbi", display_name: "SBI Customer Support (Fake)", first_seen: true, age_days: 1 },
      context: { request_type: "PAY", narration: "Verification token fee" },
      device: { new_device: true, remote_access_app_active: true, call_in_progress: true, time_to_confirm_s: 180 },
    },
  },
  {
    id: "legit-qr",
    tag: "Legit",
    label: "Legitimate merchant QR",
    description: "Verified shop QR where merchant name and VPA match expected identity.",
    payload: {
      ...base("legit-qr"),
      amount: 850,
      payee: { vpa: "sharmasweets@okaxis", display_name: "Sharma Sweets", first_seen: false, age_days: 820 },
      context: {
        request_type: "QR",
        narration: "Sweets purchase",
        qr_merchant_name: "Sharma Sweets",
        expected_merchant_vpa: "sharmasweets@okaxis",
      },
      device: { new_device: false, remote_access_app_active: false, call_in_progress: false, time_to_confirm_s: 30 },
    },
  },
  {
    id: "legit-p2p",
    tag: "Legit",
    label: "Legitimate friend transfer",
    description: "Regular peer-to-peer transfer to a trusted contact.",
    payload: {
      ...base("legit-p2p"),
      amount: 2500,
      payee: { vpa: "priya.verma@okhdfcbank", display_name: "Priya Verma", first_seen: false, age_days: 450 },
      context: { request_type: "PAY", narration: "Dinner split" },
      device: { new_device: false, remote_access_app_active: false, call_in_progress: false, time_to_confirm_s: 20 },
    },
  },
  {
    id: "unseen-s7",
    tag: "Adaptivity (S7)",
    label: "Unseen scam: Job portal fee",
    description: "Novel pattern excluded from supervised training to test anomaly detection.",
    payload: {
      ...base("s7-novel"),
      amount: 4999,
      payee: { vpa: "careers.gatepass@icici", display_name: "Apex Job Portal Security", first_seen: true, age_days: 4 },
      context: { request_type: "PAY", narration: "Interview security deposit refundable upon exam", link_risk: 0.82 },
      device: { new_device: true, remote_access_app_active: false, call_in_progress: false, time_to_confirm_s: 5 },
      network: {
        payee_distinct_senders_24h: 18,
        forwarded_value_ratio_1h: 0.72,
        median_forward_delay_min: 25,
        account_age_days: 8,
      },
    },
  },
];
