"""
JARVIS Circadian Anchor Module
Enforces strict 01:30 AM bedtime and 08:30 AM wake schedules with escalating protocols.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from config import BEDTIME_HOUR, BEDTIME_MINUTE, ESCALATION_LEVELS, WAKE_HOUR, WAKE_MINUTE


def get_circadian_status() -> dict[str, Any]:
    now = datetime.now()
    
    # Calculate next Bedtime anchor (01:30)
    bedtime_today = now.replace(hour=BEDTIME_HOUR, minute=BEDTIME_MINUTE, second=0, microsecond=0)
    if now > bedtime_today and now.hour >= 4:
        # If passed 01:30 and it's morning/afternoon, next bedtime is tomorrow 01:30
        next_bedtime = bedtime_today + timedelta(days=1)
    elif now > bedtime_today:
        # It's currently past 01:30 AM (sleep protocol breached)
        next_bedtime = bedtime_today
    else:
        next_bedtime = bedtime_today

    # Calculate next Wake anchor (08:30)
    wake_today = now.replace(hour=WAKE_HOUR, minute=WAKE_MINUTE, second=0, microsecond=0)
    if now > wake_today:
        next_wake = wake_today + timedelta(days=1)
    else:
        next_wake = wake_today

    time_until_bedtime = (next_bedtime - now).total_seconds()
    time_until_wake = (next_wake - now).total_seconds()

    # Determine compliance state
    is_bedtime_breach = now.hour in (1, 2, 3) and (now.hour > 1 or now.minute >= 30)
    
    # Calculate escalation level
    if is_bedtime_breach:
        minutes_past = int((now - bedtime_today).total_seconds() // 60)
        if minutes_past > 60:
            level = 3
        elif minutes_past > 20:
            level = 2
        else:
            level = 1
    else:
        level = 1

    hours_rem = max(0, int(time_until_bedtime // 3600))
    mins_rem = max(0, int((time_until_bedtime % 3600) // 60))

    return {
        "current_time": now.strftime("%H:%M:%S"),
        "bedtime_target": f"{BEDTIME_HOUR:02d}:{BEDTIME_MINUTE:02d}",
        "wake_target": f"{WAKE_HOUR:02d}:{WAKE_MINUTE:02d}",
        "time_until_bedtime_seconds": int(time_until_bedtime),
        "bedtime_countdown": f"{hours_rem}h {mins_rem}m",
        "is_bedtime_breached": is_bedtime_breach,
        "escalation_level": level,
        "escalation_name": ESCALATION_LEVELS[level]["name"],
    }


def format_circadian_speech(status: dict[str, Any]) -> str:
    if status["is_bedtime_breached"]:
        level = status["escalation_level"]
        if level == 3:
            return (
                "Critical Protocol Violation, Boss. Bedtime was 01:30. "
                "Enforcement level 3 active. Power down immediately."
            )
        elif level == 2:
            return (
                "Alert, Boss. Sleep schedule is breached past 01:30. "
                "Cognitive recovery degradation imminent. Terminate active sessions now."
            )
        else:
            return (
                "Notice, Boss. Bedtime anchor 01:30 has passed. "
                "Conclude current operations and initiate rest sequence."
            )
    else:
        return (
            f"Circadian anchor nominal, Boss. Bedtime scheduled at {status['bedtime_target']} "
            f"({status['bedtime_countdown']} remaining). Wake anchor set for {status['wake_target']}."
        )
