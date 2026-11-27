"""
JARVIS Autonomous Bot Engine - Configuration
Deterministic, High-Speed, Zero-AI Core Architecture
"""
from __future__ import annotations

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
# In Vercel serverless runtime, only /tmp is writable for SQLite persistence
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    STORAGE_DIR = Path("/tmp") / "jarvis_storage"
else:
    STORAGE_DIR = BASE_DIR / "storage"

DATABASE_PATH = STORAGE_DIR / "jarvis.db"

STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Persona & Behavioral Axioms
SYSTEM_NAME = "JARVIS"
USER_TITLE = "Boss"
PERSONA_PROMPT = (
    "Authoritative, sharp, analytical, calm, and unyielding. "
    "Zero conversational filler. Strictly professional execution."
)

# Circadian Anchors (24-Hour Format)
BEDTIME_HOUR = 1
BEDTIME_MINUTE = 30  # 01:30 AM Bedtime Anchor

WAKE_HOUR = 8
WAKE_MINUTE = 30     # 08:30 AM Wake Anchor

# Alert Escalation Levels
ESCALATION_LEVELS = {
    1: {"name": "Advisory Notification", "beep_frequency": 800, "beep_duration_ms": 200},
    2: {"name": "Urgent Warning", "beep_frequency": 1200, "beep_duration_ms": 400},
    3: {"name": "Enforcement Lock", "beep_frequency": 1600, "beep_duration_ms": 800},
}

# Network Server Settings
HOST = "0.0.0.0"
PORT = 8000
