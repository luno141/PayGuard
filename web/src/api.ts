import type { DashboardStats, EvaluationMetrics, ScoreRequest, ScoreResponse } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    throw new Error((await response.json().catch(() => null))?.detail ?? "The API request failed.");
  }
  return response.json() as Promise<T>;
}

export const scorePayment = (payload: ScoreRequest) =>
  request<ScoreResponse>("/score", { method: "POST", body: JSON.stringify(payload) });

export const getStats = () => request<DashboardStats>("/stats");

export const getAllTransactions = () => request<ScoreResponse[]>("/transactions?flagged=false");

export const getFlaggedTransactions = () => request<ScoreResponse[]>("/transactions?flagged=true");

export const submitFeedback = (txnId: string, label: "FRAUD" | "LEGIT") =>
  request(`/feedback`, { method: "POST", body: JSON.stringify({ txn_id: txnId, label }) });

export const getMetrics = () => request<EvaluationMetrics>("/metrics");

export const triggerRetrain = () =>
  request<{ status: string; message: string; previous_version: string; new_version: string; delta_recall: string; delta_fpr: string }>(
    "/retrain",
    { method: "POST" }
  );
