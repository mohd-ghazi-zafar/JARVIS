"""
JARVIS Dynamic Task Prioritizer & Productivity Ledger
Persists to-dos with dynamic urgency scoring and performance tracking.
"""
from __future__ import annotations

from datetime import datetime
import sqlite3
from typing import Any

from config import DATABASE_PATH


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 2,
                urgency_score REAL NOT NULL DEFAULT 0.0,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
            """
        )
        conn.commit()


def calculate_urgency(priority: int, created_at_str: str) -> float:
    try:
        created_at = datetime.fromisoformat(created_at_str)
    except Exception:
        created_at = datetime.now()
    age_hours = (datetime.now() - created_at).total_seconds() / 3600.0
    # Formula: Priority weight (1-4 -> 2.5-10.0) + aging factor
    return round((priority * 2.5) + min(5.0, age_hours * 0.5), 2)


def add_task(title: str, priority: int = 2) -> dict[str, Any]:
    priority = max(1, min(4, priority))
    now_str = datetime.now().isoformat()
    urgency = calculate_urgency(priority, now_str)
    with _get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tasks (title, priority, urgency_score, status, created_at)
            VALUES (?, ?, ?, 'pending', ?)
            """,
            (title, priority, urgency, now_str),
        )
        task_id = cursor.lastrowid
        conn.commit()

    return {
        "id": task_id,
        "title": title,
        "priority": priority,
        "urgency_score": urgency,
        "status": "pending",
        "created_at": now_str,
    }


def list_tasks(include_completed: bool = False) -> list[dict[str, Any]]:
    query = "SELECT * FROM tasks"
    if not include_completed:
        query += " WHERE status = 'pending'"
    query += " ORDER BY urgency_score DESC, priority DESC, id ASC"

    with _get_db() as conn:
        rows = conn.execute(query).fetchall()
        tasks: list[dict[str, Any]] = []
        for r in rows:
            urgency = (
                calculate_urgency(r["priority"], r["created_at"])
                if r["status"] == "pending"
                else r["urgency_score"]
            )
            tasks.append(
                {
                    "id": r["id"],
                    "title": r["title"],
                    "priority": r["priority"],
                    "urgency_score": urgency,
                    "status": r["status"],
                    "created_at": r["created_at"],
                    "completed_at": r["completed_at"],
                }
            )
        return tasks


def complete_task(task_id: int) -> dict[str, Any] | None:
    now_str = datetime.now().isoformat()
    with _get_db() as conn:
        conn.execute(
            """
            UPDATE tasks SET status = 'completed', completed_at = ?
            WHERE id = ?
            """,
            (now_str, task_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not row:
            return None
        return dict(row)


def get_daily_metrics() -> dict[str, Any]:
    today_prefix = datetime.now().strftime("%Y-%m-%d")
    with _get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        completed = conn.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed'").fetchone()[0]
        pending = conn.execute("SELECT COUNT(*) FROM tasks WHERE status = 'pending'").fetchone()[0]
        today_completed = conn.execute(
            "SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND completed_at LIKE ?",
            (f"{today_prefix}%",),
        ).fetchone()[0]

    completion_rate = round((completed / total * 100.0), 1) if total > 0 else 100.0
    return {
        "date": today_prefix,
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": pending,
        "completed_today": today_completed,
        "completion_rate_pct": completion_rate,
        "efficiency_score": min(100.0, round(completion_rate * 0.8 + 20.0, 1)) if total > 0 else 100.0,
    }


# Ensure database initializes on module load
init_db()
