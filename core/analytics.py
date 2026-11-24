"""
JARVIS Daily Analytics & Behavioral Loop Engine
Monitors completion rates, calculates productivity metrics, generates evening summaries,
and adjusts system strictness dynamically based on historical habit adherence.
"""
from __future__ import annotations

from datetime import datetime
import sqlite3
from typing import Any

from config import DATABASE_PATH
from core.circadian import get_circadian_status
from core.shield import get_shield_status
from core.tasks import get_daily_metrics


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_analytics_db() -> None:
    with _get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                total_tasks INTEGER NOT NULL,
                completed_tasks INTEGER NOT NULL,
                completion_rate REAL NOT NULL,
                distraction_breaches INTEGER NOT NULL,
                adherence_score REAL NOT NULL,
                strictness_level INTEGER NOT NULL,
                summary_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS habit_adherence_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                event_type TEXT NOT NULL,
                details TEXT,
                compliance_value REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def log_habit_event(event_type: str, details: str, compliance_score: float) -> None:
    today_str = datetime.now().strftime("%Y-%m-%d")
    with _get_db() as conn:
        conn.execute(
            """
            INSERT INTO habit_adherence_logs (date, event_type, details, compliance_value)
            VALUES (?, ?, ?, ?)
            """,
            (today_str, event_type, details, compliance_score),
        )
        conn.commit()


def calculate_historical_adherence() -> dict[str, Any]:
    with _get_db() as conn:
        # Pull last 7 summaries
        rows = conn.execute(
            "SELECT * FROM daily_summaries ORDER BY id DESC LIMIT 7"
        ).fetchall()
        
    if not rows:
        return {
            "adherence_score_pct": 100.0,
            "sample_days": 0,
            "recommended_strictness": 1,
            "status": "Nominal Baseline",
        }

    scores = [r["adherence_score"] for r in rows]
    avg_score = round(sum(scores) / len(scores), 1)

    # Dynamic Strictness Adjustment based on historical compliance loops:
    # Score < 70% -> Level 3 (Lockdown / Aggressive escalation)
    # Score < 85% -> Level 2 (Restrictive / Heightened warnings)
    # Score >= 85% -> Level 1 (Nominal / Standard advisory)
    if avg_score < 70.0:
        strictness = 3
        status = "Strictness Level 3 (Aggressive Enforcement - Critical Breach History)"
    elif avg_score < 85.0:
        strictness = 2
        status = "Strictness Level 2 (Heightened Protocol - Moderate Adherence)"
    else:
        strictness = 1
        status = "Strictness Level 1 (Nominal - High Adherence History)"

    return {
        "adherence_score_pct": avg_score,
        "sample_days": len(rows),
        "recommended_strictness": strictness,
        "status": status,
    }


def generate_evening_summary() -> dict[str, Any]:
    task_metrics = get_daily_metrics()
    circadian = get_circadian_status()
    shield = get_shield_status()
    history = calculate_historical_adherence()

    today_str = task_metrics["date"]
    comp_rate = task_metrics["completion_rate_pct"]
    breaches = shield["breaches_detected_total"]
    
    # Calculate today's adherence:
    # 70% task completion + 30% circadian/distraction discipline
    circadian_penalty = 20.0 if circadian["is_bedtime_breached"] else 0.0
    distraction_penalty = min(20.0, breaches * 5.0)
    discipline_score = max(0.0, 100.0 - circadian_penalty - distraction_penalty)
    today_adherence = round((comp_rate * 0.7) + (discipline_score * 0.3), 1)

    strictness = history["recommended_strictness"]
    if today_adherence < 70.0:
        strictness = max(strictness, 2)

    summary_text = (
        f"Executive Performance Brief for {today_str}: "
        f"Tasks Completed: {task_metrics['completed_tasks']}/{task_metrics['total_tasks']} ({comp_rate}%). "
        f"Distraction Breaches: {breaches}. "
        f"Habit Loop Adherence: {today_adherence}%. "
        f"Operational Strictness: Level {strictness} ({history['status']})."
    )

    with _get_db() as conn:
        conn.execute(
            """
            INSERT INTO daily_summaries 
            (date, total_tasks, completed_tasks, completion_rate, distraction_breaches, adherence_score, strictness_level, summary_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                total_tasks=excluded.total_tasks,
                completed_tasks=excluded.completed_tasks,
                completion_rate=excluded.completion_rate,
                distraction_breaches=excluded.distraction_breaches,
                adherence_score=excluded.adherence_score,
                strictness_level=excluded.strictness_level,
                summary_text=excluded.summary_text
            """,
            (
                today_str,
                task_metrics["total_tasks"],
                task_metrics["completed_tasks"],
                comp_rate,
                breaches,
                today_adherence,
                strictness,
                summary_text,
            ),
        )
        conn.commit()

    return {
        "date": today_str,
        "task_metrics": task_metrics,
        "circadian_status": circadian,
        "distraction_breaches": breaches,
        "today_adherence_score_pct": today_adherence,
        "historical_adherence": history,
        "operational_strictness_level": strictness,
        "executive_summary": summary_text,
    }


# Initialize tables on import
init_analytics_db()
