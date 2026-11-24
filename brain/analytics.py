from __future__ import annotations

from datetime import datetime, date
from pathlib import Path
import sqlite3
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "analytics.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                priority INTEGER DEFAULT 2,
                urgency_score REAL DEFAULT 0.0,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS circadian_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT NOT NULL,
                target_time TEXT NOT NULL,
                escalation_level INTEGER DEFAULT 1,
                status TEXT DEFAULT 'enforced'
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS distraction_breaches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                package_name TEXT NOT NULL,
                work_block_id TEXT DEFAULT 'default',
                action_taken TEXT DEFAULT 'killed_to_home'
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                completion_rate REAL,
                total_tasks INTEGER,
                completed_tasks INTEGER,
                distraction_breaches_count INTEGER,
                circadian_compliance_score REAL,
                executive_summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def add_task(title: str, priority: int = 2) -> dict[str, Any]:
    priority_clamped = max(1, min(4, priority))
    urgency_score = round(priority_clamped * 2.5, 2)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tasks (title, priority, urgency_score, status)
            VALUES (?, ?, ?, 'pending')
            """,
            (title, priority_clamped, urgency_score),
        )
        conn.commit()
        task_id = cursor.lastrowid
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        row = cursor.fetchone()
        return dict(row)


def complete_task(task_id: int) -> dict[str, Any] | None:
    now = datetime.now().isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE tasks
            SET status = 'completed', completed_at = ?
            WHERE id = ?
            """,
            (now, task_id),
        )
        conn.commit()
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def list_tasks(status: str | None = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        if status:
            cursor.execute(
                "SELECT * FROM tasks WHERE status = ? ORDER BY urgency_score DESC, id DESC",
                (status,),
            )
        else:
            cursor.execute(
                "SELECT * FROM tasks ORDER BY urgency_score DESC, id DESC"
            )
        return [dict(r) for r in cursor.fetchall()]


def log_distraction_breach(package_name: str, work_block_id: str = "default") -> None:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO distraction_breaches (package_name, work_block_id, action_taken)
            VALUES (?, ?, 'killed_to_home')
            """,
            (package_name, work_block_id),
        )
        conn.commit()


def log_circadian_event(event_type: str, target_time: str, level: int = 1) -> None:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO circadian_events (event_type, target_time, escalation_level, status)
            VALUES (?, ?, ?, 'enforced')
            """,
            (event_type, target_time, level),
        )
        conn.commit()


def get_daily_metrics() -> dict[str, Any]:
    today_str = date.today().isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM tasks
            """
        )
        task_stats = cursor.fetchone()
        total_tasks = task_stats["total"] or 0
        completed_tasks = task_stats["completed"] or 0
        pending_tasks = task_stats["pending"] or 0
        completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 100.0

        cursor.execute(
            """
            SELECT COUNT(*) as breach_count
            FROM distraction_breaches
            WHERE date(timestamp) = date('now')
            """
        )
        breaches = cursor.fetchone()["breach_count"] or 0

        cursor.execute(
            """
            SELECT COUNT(*) as event_count
            FROM circadian_events
            WHERE date(timestamp) = date('now')
            """
        )
        circadian_count = cursor.fetchone()["event_count"] or 0

        # Habit compliance formula
        # Base 100%, -5% per distraction breach, -10% per circadian escalation
        adherence_score = max(0.0, round(100.0 - (breaches * 5.0) - (circadian_count * 10.0), 1))

        # Dynamic strictness calculation
        strictness_level = 1
        if breaches >= 3 or circadian_count >= 2:
            strictness_level = 3
        elif breaches >= 1 or circadian_count >= 1:
            strictness_level = 2

        return {
            "date": today_str,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "completion_rate_pct": completion_rate,
            "distraction_breaches_today": breaches,
            "circadian_events_today": circadian_count,
            "adherence_score_pct": adherence_score,
            "recommended_strictness_level": strictness_level,
        }


def save_daily_summary(summary_data: dict[str, Any], text: str) -> None:
    today_str = summary_data.get("date", date.today().isoformat())
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO daily_summaries (
                date, completion_rate, total_tasks, completed_tasks,
                distraction_breaches_count, circadian_compliance_score, executive_summary
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                completion_rate = excluded.completion_rate,
                total_tasks = excluded.total_tasks,
                completed_tasks = excluded.completed_tasks,
                distraction_breaches_count = excluded.distraction_breaches_count,
                circadian_compliance_score = excluded.circadian_compliance_score,
                executive_summary = excluded.executive_summary
            """,
            (
                today_str,
                summary_data.get("completion_rate_pct", 100.0),
                summary_data.get("total_tasks", 0),
                summary_data.get("completed_tasks", 0),
                summary_data.get("distraction_breaches_today", 0),
                summary_data.get("adherence_score_pct", 100.0),
                text,
            ),
        )
        conn.commit()


# Initialize database upon import
init_db()
