"""
JARVIS Intent Router & Decision Engine
Ultra-fast, deterministic pattern router delivering sub-millisecond response latency.
Zero AI/LLM models required.
"""
from __future__ import annotations

import re
import sys
from typing import Any

from core.circadian import format_circadian_speech, get_circadian_status
from core.tasks import add_task, complete_task, get_daily_metrics, list_tasks
from core.telemetry import format_telemetry_speech, get_hardware_telemetry
from core.voice import alert_beep, speak


class IntentResponse:
    def __init__(self, action: str, speech: str, data: dict[str, Any] | None = None):
        self.action = action
        self.speech = speech
        self.data = data or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "action": self.action,
            "speech": self.speech,
            "data": self.data,
        }


def process_command(raw_input: str, voice_enabled: bool = False) -> IntentResponse:
    query = raw_input.strip()
    lower = query.lower()

    if not query:
        return IntentResponse("none", "Awaiting command, Boss.")

    # 1. Status / Comprehensive Operational Check
    if any(k in lower for k in ["status", "report", "you there", "online", "ping", "diagnostics"]):
        circ = get_circadian_status()
        telem = get_hardware_telemetry()
        cpu = telem.get("cpu_percent", 0.0)
        speech = (
            f"All systems operational, Boss. Neural engine active in deterministic zero-latency mode. "
            f"CPU load: {cpu}%. Circadian anchor tracking {circ['bedtime_target']} bedtime "
            f"({circ['bedtime_countdown']} remaining)."
        )
        if voice_enabled:
            speak(speech)
        return IntentResponse("status", speech, {"circadian": circ, "telemetry": telem})

    # 2. System Telemetry / Hardware Inspection
    if any(k in lower for k in ["telemetry", "cpu", "ram", "memory", "battery", "hardware", "disk usage"]):
        telemetry = get_hardware_telemetry()
        speech = format_telemetry_speech(telemetry)
        if voice_enabled:
            speak(speech)
        return IntentResponse("inspect_telemetry", speech, {"telemetry": telemetry})

    # 3. Circadian Anchor Protocols
    if any(k in lower for k in ["circadian", "sleep", "bedtime", "wake", "schedule", "anchor"]):
        circadian = get_circadian_status()
        speech = format_circadian_speech(circadian)
        if voice_enabled:
            speak(speech)
            if circadian["is_bedtime_breached"]:
                alert_beep(1200, 400)
        return IntentResponse("circadian_anchor", speech, {"circadian": circadian})

    # 3. Task Management: Add Task
    add_match = re.search(r"(?:add task|new task|create task|task add)\s+(.+)", lower)
    if add_match:
        task_text = query[add_match.start(1):].strip()
        priority = 2
        # Check priority tags: p1, p2, p3, p4 or urgent
        p_match = re.search(r"\b(p[1-4]|urgent|critical|low|high)\b", task_text, re.I)
        if p_match:
            tag = p_match.group(1).lower()
            if tag in ["p4", "urgent", "critical"]:
                priority = 4
            elif tag in ["p3", "high"]:
                priority = 3
            elif tag in ["p1", "low"]:
                priority = 1
            task_text = re.sub(r"\b(p[1-4]|urgent|critical|low|high)\b", "", task_text, flags=re.I).strip()

        task = add_task(task_text or "Unspecified task", priority=priority)
        speech = f"Task #{task['id']} logged, Boss. Priority {priority} (Urgency: {task['urgency_score']})."
        if voice_enabled:
            speak(speech)
        return IntentResponse("task_add", speech, {"task": task})

    # 4. Task Management: Complete Task
    comp_match = re.search(r"(?:complete task|finish task|done task|task done|task complete)\s+(\d+)", lower)
    if comp_match:
        task_id = int(comp_match.group(1))
        task = complete_task(task_id)
        if task:
            speech = f"Task #{task_id} completed and archived, Boss."
        else:
            speech = f"Task #{task_id} not found in the ledger, Boss."
        if voice_enabled:
            speak(speech)
        return IntentResponse("task_complete", speech, {"task": task})

    # 5. Task Management: List Tasks / Daily Metrics
    if any(k in lower for k in ["list tasks", "show tasks", "tasks", "to-do", "todo", "productivity", "analytics"]):
        tasks = list_tasks(include_completed=False)
        metrics = get_daily_metrics()
        count = len(tasks)
        if count == 0:
            speech = "Task queue clear, Boss. All priority objectives completed."
        else:
            top = tasks[0]
            speech = (
                f"{count} pending tasks, Boss. Highest urgency: Task #{top['id']} "
                f"'{top['title']}' (Urgency: {top['urgency_score']}). "
                f"Overall completion rate: {metrics['completion_rate_pct']}%."
            )
        if voice_enabled:
            speak(speech)
        return IntentResponse("task_list", speech, {"tasks": tasks, "metrics": metrics})


    # 7. Voice Output Directive
    speak_match = re.search(r"^(?:say|speak|announce)\s+(.+)", lower)
    if speak_match:
        text_to_speak = query[speak_match.start(1):].strip()
        speak(text_to_speak)
        return IntentResponse("speak", f"Audio dispatched: '{text_to_speak}'", {"text": text_to_speak})

    # 8. Help / Capabilities
    if any(k in lower for k in ["help", "commands", "manual", "guide"]):
        speech = (
            "Available modules, Boss: "
            "1. Telemetry ('cpu', 'memory', 'battery') | "
            "2. Circadian Anchor ('sleep', 'bedtime', 'wake') | "
            "3. Task Prioritizer ('add task <name> [p1-p4]', 'list tasks', 'complete task <id>') | "
            "4. Speech Output ('say <text>') | "
            "5. Status Diagnostics ('status', 'report')."
        )
        return IntentResponse("help", speech, {})

    # Default / Unmatched Intent: Clinical, Authoritative Fallback
    speech = (
        f"Command parsed: '{query}'. Subsystem mapped, Boss. "
        f"Specify a targeted directive: 'telemetry', 'tasks', 'circadian', or 'status'."
    )
    return IntentResponse("unknown", speech, {"input": query})
