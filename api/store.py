"""Small SQLite event store for scored transactions and analyst feedback."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


class EventStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connection(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connection() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS transactions (
                    txn_id TEXT PRIMARY KEY,
                    request_json TEXT NOT NULL,
                    response_json TEXT NOT NULL,
                    risk INTEGER NOT NULL,
                    decision TEXT NOT NULL,
                    scenario TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS feedback (
                    txn_id TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (txn_id) REFERENCES transactions(txn_id)
                );
                """
            )

    def save_score(self, request: dict[str, Any], response: dict[str, Any]) -> None:
        with self._connection() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO transactions
                (txn_id, request_json, response_json, risk, decision, scenario)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    response["txn_id"],
                    json.dumps(request, default=str),
                    json.dumps(response, default=str),
                    response["risk"],
                    response["decision"],
                    response.get("scenario"),
                ),
            )

    def save_feedback(self, txn_id: str, label: str) -> bool:
        with self._connection() as connection:
            transaction = connection.execute(
                "SELECT 1 FROM transactions WHERE txn_id = ?", (txn_id,)
            ).fetchone()
            if transaction is None:
                return False
            connection.execute(
                "INSERT OR REPLACE INTO feedback (txn_id, label) VALUES (?, ?)", (txn_id, label)
            )
        return True

    def transactions(self, flagged_only: bool = False) -> list[dict[str, Any]]:
        query = """
            SELECT t.txn_id, t.request_json, t.response_json, t.created_at, f.label as feedback_label
            FROM transactions t
            LEFT JOIN feedback f ON t.txn_id = f.txn_id
        """
        if flagged_only:
            query += " WHERE t.decision != 'ALLOW'"
        query += " ORDER BY t.created_at DESC"
        with self._connection() as connection:
            rows = connection.execute(query).fetchall()
        result = []
        for row in rows:
            item = json.loads(row["response_json"])
            item["created_at"] = row["created_at"]
            item["feedback"] = row["feedback_label"]
            try:
                item["request"] = json.loads(row["request_json"])
            except Exception:
                item["request"] = None
            result.append(item)
        return result

    def stats(self) -> dict[str, int]:
        with self._connection() as connection:
            total = connection.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
            flagged = connection.execute(
                "SELECT COUNT(*) FROM transactions WHERE decision != 'ALLOW'"
            ).fetchone()[0]
            feedback = connection.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
        return {"transactions_scored": total, "flagged_transactions": flagged, "feedback_count": feedback}
