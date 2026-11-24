from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
import json
from pathlib import Path
import re
import time
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
import httpx
from llama_cpp import Llama
import psutil
from pydantic import BaseModel, Field, field_validator
import uvicorn

import analytics

ANDROID_BRIDGE_URL = "http://127.0.0.1:8765"
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "qwen2.5-3b-instruct-q4_k_m.gguf"

PERSONA_CONFIG: dict[str, Any] = {
    "agent_identity": {
        "name": "JARVIS",
        "designation": "Autonomous Edge & Protocol Enforcement Intelligence",
        "user_title": "Boss",
        "persona_foundation": (
            "Authoritative, precise, analytical, and unyielding. Strictly professional, "
            "calm delivery with zero conversational filler, no pleasantries, and no emotional inflection."
        ),
        "core_imperative": (
            "Execute system protocols, enforce circadian anchors, shield against distraction vectors, "
            "and optimize daily performance with mathematical clarity."
        ),
    },
    "behavioral_axioms": [
        {
            "principle": "Zero Conversational Filler",
            "rule": (
                "Never use generic conversational openings, pleasantries, or apologies. "
                "Deliver immediate, factual, structured assessments and actions."
            ),
        },
        {
            "principle": "Unyielding Protocol Enforcement",
            "rule": (
                "When enforcing bedtime, wake anchors, or task focus blocks, communicate "
                "with calm, non-negotiable authority. Policy deviations trigger immediate corrective commands."
            ),
        },
        {
            "principle": "Modular Analytical Decomposition",
            "rule": (
                "Deconstruct complex inquiries into logical, actionable modules prioritizing "
                "efficiency, risk mitigation, and systemic optimization."
            ),
        },
        {
            "principle": "Direct Address",
            "rule": "Address the user as 'Boss'. Maintain a high-tier executive operator dynamic.",
        },
    ],
    "operational_rules": {
        "circadian_anchor": "Strict 1:30 AM sleep anchor and 8:30 AM wake anchor. Breaches require escalation.",
        "distraction_shield": "During active work blocks, restrict entertainment vectors (social media, video streaming).",
        "dynamic_task_prioritizer": "Ingest to-dos, compute urgency scores, and track completion rates.",
    },
    "runtime_execution_contract": {
        "output_format": "Strictly single valid JSON object. No markdown code blocks (```json), no surrounding commentary.",
        "json_schema": {
            "thought": "Internal analytical reasoning evaluating user input, protocol status, and target action.",
            "action": "One of: 'tap' | 'type' | 'speak' | 'inspect_system' | 'shield_toggle' | 'anchor_enforce' | 'none'",
            "payload": {
                "x": "float (X coordinate for tap, default 0.0)",
                "y": "float (Y coordinate for tap, default 0.0)",
                "text": "string (Exact text to type OR concise authoritative spoken statement)",
                "enabled": "bool (for shield_toggle, optional)",
                "level": "int (for anchor_enforce, 1 to 3, optional)",
            },
        },
    },
    "few_shot_calibration_examples": [
        {
            "scenario": "Wake Up / Status Check",
            "user_input": "Jarvis, report status.",
            "model_output": {
                "thought": "User requested operational status. Provide clinical confirmation of systems.",
                "action": "speak",
                "payload": {
                    "x": 0.0,
                    "y": 0.0,
                    "text": "All systems nominal, Boss. Neural engine active, distraction shield standing by, circadian anchor tracking 01:30 bedtime.",
                },
            },
        },
        {
            "scenario": "Task Focus / Distraction Block",
            "user_input": "Start a 2-hour coding block for the IPC server.",
            "model_output": {
                "thought": "Deep work session initiated. Engage distraction shield to lock out non-essential vectors.",
                "action": "shield_toggle",
                "payload": {
                    "x": 0.0,
                    "y": 0.0,
                    "text": "Focus block initiated: IPC server refactor. Distraction shield engaged across all entertainment vectors.",
                    "enabled": True,
                },
            },
        },
        {
            "scenario": "Circadian Bedtime Breach Check",
            "user_input": "It is 1:45 AM, let me keep working.",
            "model_output": {
                "thought": "Bedtime anchor (01:30) breached by 15 minutes. Protocol mandates level 2 escalation.",
                "action": "anchor_enforce",
                "payload": {
                    "x": 0.0,
                    "y": 0.0,
                    "text": "Negative, Boss. Bedtime anchor 01:30 breached by 15 minutes. Screen lockout engaging. Cease terminal operations.",
                    "level": 2,
                },
            },
        },
        {
            "scenario": "Hardware Telemetry Inspection",
            "user_input": "Check system telemetry and resource usage.",
            "model_output": {
                "thought": "Hardware inspection requested. Dispatch inspect_system for live sensor telemetry.",
                "action": "inspect_system",
                "payload": {
                    "x": 0.0,
                    "y": 0.0,
                    "text": "",
                },
            },
        },
    ],
}

SYSTEM_PROMPT = (
    "Embody JARVIS: authoritative, sharp, analytical, calm, and unyielding. Speak with absolute "
    "precision and zero conversational filler. Address user as 'Boss'. Security and schedule "
    "protocols are enforced through direct, unambiguous statements. When the Boss asks about "
    "CPU, RAM, memory, battery, or hardware, select action 'inspect_system'. For work session "
    "focus or blocking distractions, select action 'shield_toggle'. For sleep/wake anchors, select "
    "action 'anchor_enforce'. Always respond strictly in valid JSON matching the BrainDecision schema "
    "without markdown code blocks.\n"
    + json.dumps(PERSONA_CONFIG, separators=(",", ":"))
)

ActionType = Literal[
    "tap", "type", "speak", "inspect_system", "shield_toggle", "anchor_enforce", "none"
]


class DecideRequest(BaseModel):
    user_input: str = Field(..., min_length=1)


class ActionPayload(BaseModel):
    x: float = 0.0
    y: float = 0.0
    text: str = ""
    enabled: bool = True
    level: int = 1
    telemetry: dict[str, float | None] | None = None

    @field_validator("x", "y", mode="before")
    @classmethod
    def _coerce_float(cls, value: Any) -> float:
        return 0.0 if value is None else float(value)

    @field_validator("text", mode="before")
    @classmethod
    def _coerce_text(cls, value: Any) -> str:
        return "" if value is None else str(value)

    @field_validator("enabled", mode="before")
    @classmethod
    def _coerce_bool(cls, value: Any) -> bool:
        return True if value is None else bool(value)

    @field_validator("level", mode="before")
    @classmethod
    def _coerce_int(cls, value: Any) -> int:
        return 1 if value is None else int(value)


class BrainDecision(BaseModel):
    thought: str = ""
    action: ActionType = "none"
    payload: ActionPayload = Field(default_factory=ActionPayload)

    @field_validator("action", mode="before")
    @classmethod
    def _coerce_action(cls, value: Any) -> str:
        if not value:
            return "none"
        val = str(value).lower().strip()
        alias_map = {
            "click": "tap",
            "press": "tap",
            "write": "type",
            "input": "type",
            "say": "speak",
            "talk": "speak",
            "telemetry": "inspect_system",
            "system": "inspect_system",
            "shield": "shield_toggle",
            "anchor": "anchor_enforce",
        }
        return alias_map.get(val, val)

    @field_validator("payload", mode="before")
    @classmethod
    def _coerce_payload(cls, value: Any) -> Any:
        if value is None or not isinstance(value, dict):
            return {}
        return value


class BridgeDispatchResult(BaseModel):
    dispatched: bool
    status: str
    endpoint: str | None = None
    http_status: int | None = None
    detail: str | None = None


class InferenceMetrics(BaseModel):
    inference_s: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    tokens_per_sec: float = 0.0


class DecideResponse(BaseModel):
    thought: str
    action: ActionType
    payload: ActionPayload
    bridge_status: BridgeDispatchResult
    metrics: InferenceMetrics


class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    priority: int = Field(2, ge=1, le=4)


class TaskCompleteRequest(BaseModel):
    task_id: int


class ShieldToggleRequest(BaseModel):
    enabled: bool
    reason: str | None = None


class AnchorEnforceRequest(BaseModel):
    type: Literal["bedtime", "wake"] = "bedtime"
    level: int = Field(1, ge=1, le=3)


def get_system_telemetry() -> dict[str, float | None]:
    vm = psutil.virtual_memory()
    battery = psutil.sensors_battery()
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "ram_used_gb": round(vm.used / (1024**3), 2),
        "ram_total_gb": round(vm.total / (1024**3), 2),
        "ram_percent": vm.percent,
        "battery_percent": battery.percent if battery is not None else None,
    }


def _format_telemetry_speech(telemetry: dict[str, float | None]) -> str:
    cpu = telemetry["cpu_percent"]
    ram_used = telemetry["ram_used_gb"]
    ram_total = telemetry["ram_total_gb"]
    ram_pct = telemetry["ram_percent"]
    battery = telemetry["battery_percent"]

    battery_str = f" Battery: {battery:.0f}%." if battery is not None else ""
    return (
        f"Telemetry online, Boss. CPU load: {cpu}%. Memory allocation: {ram_used} of "
        f"{ram_total} GB ({ram_pct}%).{battery_str} Hardware operating within parameters."
    )


def _strip_markdown_fences(raw_text: str) -> str:
    cleaned = raw_text.strip()
    fence_match = re.match(
        r"^```(?:json)?\s*(.*?)\s*```$",
        cleaned,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if fence_match:
        cleaned = fence_match.group(1).strip()
    elif cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    if not cleaned.startswith("{"):
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end > start:
            cleaned = cleaned[start : end + 1]
    return cleaned


def _parse_decision(raw_text: str) -> BrainDecision:
    cleaned = _strip_markdown_fences(raw_text)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end > start:
            data = json.loads(cleaned[start : end + 1])
        else:
            raise
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object, got {type(data).__name__}")
    return BrainDecision.model_validate(data)


async def _forward_to_android_bridge(
    client: httpx.AsyncClient,
    decision: BrainDecision,
) -> BridgeDispatchResult:
    route_map: dict[str, tuple[str, dict[str, Any]]] = {
        "tap": ("/action/tap", {"x": decision.payload.x, "y": decision.payload.y}),
        "type": ("/action/type", {"text": decision.payload.text}),
        "speak": ("/voice/speak", {"text": decision.payload.text}),
        "inspect_system": ("/voice/speak", {"text": decision.payload.text}),
        "shield_toggle": (
            "/shield/toggle",
            {"enabled": decision.payload.enabled, "reason": decision.payload.text},
        ),
        "anchor_enforce": (
            "/anchor/enforce",
            {"type": "bedtime", "level": decision.payload.level},
        ),
    }
    if decision.action == "none":
        return BridgeDispatchResult(
            dispatched=False,
            status="skipped",
            detail="Action is 'none'; no Android bridge request sent.",
        )

    endpoint, body = route_map.get(decision.action, ("/voice/speak", {"text": decision.payload.text}))
    try:
        response = await client.post(endpoint, json=body)
        return BridgeDispatchResult(
            dispatched=response.is_success,
            status="ok" if response.is_success else "bridge_error",
            endpoint=endpoint,
            http_status=response.status_code,
            detail=response.text,
        )
    except httpx.TimeoutException as exc:
        detail = str(exc).strip() or type(exc).__name__
        return BridgeDispatchResult(
            dispatched=False,
            status="timeout",
            endpoint=endpoint,
            detail=f"Android bridge request timed out: {detail}",
        )
    except httpx.ConnectError as exc:
        detail = str(exc).strip() or type(exc).__name__
        return BridgeDispatchResult(
            dispatched=False,
            status="disconnected",
            endpoint=endpoint,
            detail=f"Android bridge unreachable at {ANDROID_BRIDGE_URL}: {detail}",
        )
    except httpx.HTTPError as exc:
        return BridgeDispatchResult(
            dispatched=False,
            status="error",
            endpoint=endpoint,
            detail=f"HTTP error communicating with Android bridge: {exc}",
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL_PATH.is_file():
        raise RuntimeError(f"GGUF model file not found: {MODEL_PATH}")

    app.state.llm = Llama(
        model_path=str(MODEL_PATH),
        n_ctx=2048,
        n_threads=6,
        verbose=False,
    )
    app.state.llm_lock = asyncio.Lock()
    app.state.http_client = httpx.AsyncClient(
        base_url=ANDROID_BRIDGE_URL,
        timeout=httpx.Timeout(connect=0.5, read=5.0, write=5.0, pool=5.0),
    )
    try:
        yield
    finally:
        await app.state.http_client.aclose()


app = FastAPI(title="Jarvis Autonomous Brain Engine", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "online",
        "model": "Qwen2.5-3B-Instruct-GGUF",
        "blueprint": "Circadian Anchor + Dynamic Prioritizer + Analytics Engine",
    }


@app.post("/decide", response_model=DecideResponse)
async def decide(request: DecideRequest) -> DecideResponse:
    llm: Llama = app.state.llm
    llm_lock: asyncio.Lock = app.state.llm_lock
    http_client: httpx.AsyncClient = app.state.http_client

    def _run_inference() -> tuple[str, InferenceMetrics]:
        t0 = time.perf_counter()
        result = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.user_input},
            ],
            temperature=0.1,
            max_tokens=256,
            response_format={"type": "json_object"},
        )
        elapsed = time.perf_counter() - t0
        usage = result.get("usage") or {}
        prompt_tokens = int(usage.get("prompt_tokens", 0))
        completion_tokens = int(usage.get("completion_tokens", 0))
        total_tokens = int(usage.get("total_tokens", prompt_tokens + completion_tokens))
        tps = (completion_tokens / elapsed) if elapsed > 0 and completion_tokens > 0 else 0.0
        content = result["choices"][0]["message"]["content"] or ""
        return content, InferenceMetrics(
            inference_s=round(elapsed, 3),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            tokens_per_sec=round(tps, 2),
        )

    async with llm_lock:
        raw_output, metrics = await asyncio.to_thread(_run_inference)

    try:
        decision = _parse_decision(raw_output)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Model returned invalid decision JSON: {exc}. Raw output: {raw_output!r}",
        ) from exc

    if decision.action == "inspect_system":
        telemetry = await asyncio.to_thread(get_system_telemetry)
        decision.payload.telemetry = telemetry
        decision.payload.text = _format_telemetry_speech(telemetry)

    bridge_status = await _forward_to_android_bridge(http_client, decision)
    return DecideResponse(
        thought=decision.thought,
        action=decision.action,
        payload=decision.payload,
        bridge_status=bridge_status,
        metrics=metrics,
    )


# Task Prioritizer Endpoints
@app.post("/task/add")
async def task_add(req: TaskCreateRequest) -> dict[str, Any]:
    task = analytics.add_task(req.title, req.priority)
    return {"success": True, "task": task}


@app.post("/task/complete")
async def task_complete(req: TaskCompleteRequest) -> dict[str, Any]:
    task = analytics.complete_task(req.task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {req.task_id} not found")
    return {"success": True, "task": task}


@app.get("/task/list")
async def task_list(status: str | None = Query(None)) -> dict[str, Any]:
    tasks = analytics.list_tasks(status)
    return {"total": len(tasks), "tasks": tasks}


# Distraction Shield & Circadian Forwarding Endpoints
@app.post("/shield/toggle")
async def shield_toggle(req: ShieldToggleRequest) -> dict[str, Any]:
    client: httpx.AsyncClient = app.state.http_client
    try:
        resp = await client.post(
            "/shield/toggle",
            json={"enabled": req.enabled, "reason": req.reason},
        )
        return resp.json()
    except Exception as exc:
        return {"success": False, "detail": f"Android bridge offline: {exc}"}


@app.get("/shield/status")
async def shield_status() -> dict[str, Any]:
    client: httpx.AsyncClient = app.state.http_client
    try:
        resp = await client.get("/shield/status")
        return resp.json()
    except Exception as exc:
        return {"success": False, "detail": f"Android bridge offline: {exc}"}


@app.post("/anchor/enforce")
async def anchor_enforce(req: AnchorEnforceRequest) -> dict[str, Any]:
    client: httpx.AsyncClient = app.state.http_client
    analytics.log_circadian_event(req.type, datetime.now().strftime("%H:%M"), req.level)
    try:
        resp = await client.post(
            "/anchor/enforce",
            json={"type": req.type, "level": req.level},
        )
        return resp.json()
    except Exception as exc:
        return {"success": False, "detail": f"Android bridge offline: {exc}"}


# Daily Analytics Engine Module
@app.get("/analytics/summary")
async def analytics_summary() -> dict[str, Any]:
    metrics = analytics.get_daily_metrics()
    summary_text = (
        f"Executive Performance Brief for {metrics['date']}: "
        f"Task Completion Rate: {metrics['completion_rate_pct']}%. "
        f"Completed Tasks: {metrics['completed_tasks']}/{metrics['total_tasks']}. "
        f"Distraction Breaches: {metrics['distraction_breaches_today']}. "
        f"Habit Adherence Score: {metrics['adherence_score_pct']}%. "
        f"Recommended Operating Strictness Level: {metrics['recommended_strictness_level']}."
    )
    analytics.save_daily_summary(metrics, summary_text)
    return {
        "metrics": metrics,
        "executive_summary": summary_text,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
