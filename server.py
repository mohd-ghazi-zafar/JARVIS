"""
JARVIS Autonomous REST Server
Zero-AI / Zero-LLM API Bridge responding in < 2ms.
"""
from __future__ import annotations

import sys
from typing import Any

from config import HOST, PORT
from core.circadian import get_circadian_status
from core.intent_router import process_command
from core.tasks import add_task, complete_task, get_daily_metrics, list_tasks
from core.telemetry import get_hardware_telemetry

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel, Field
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False


if HAS_FASTAPI:
    app = FastAPI(
        title="JARVIS Lightweight Autonomous Server",
        description="High-speed, zero-LLM deterministic system core",
        version="2.0.0",
    )

    class CommandRequest(BaseModel):
        command: str = Field(..., min_length=1)
        voice: bool = False

    class TaskAddRequest(BaseModel):
        title: str = Field(..., min_length=1)
        priority: int = Field(2, ge=1, le=4)

    class TaskCompleteRequest(BaseModel):
        task_id: int

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {
            "status": "online",
            "system": "JARVIS Zero-LLM Core",
            "latency": "<2ms",
        }

    @app.post("/command")
    async def execute_command(req: CommandRequest) -> dict[str, Any]:
        result = process_command(req.command, voice_enabled=req.voice)
        return result.to_dict()

    @app.get("/telemetry")
    async def telemetry() -> dict[str, Any]:
        return get_hardware_telemetry()

    @app.get("/circadian")
    async def circadian() -> dict[str, Any]:
        return get_circadian_status()

    @app.get("/tasks")
    async def tasks() -> dict[str, Any]:
        return {
            "tasks": list_tasks(include_completed=False),
            "metrics": get_daily_metrics(),
        }

    @app.post("/tasks")
    async def create_task(req: TaskAddRequest) -> dict[str, Any]:
        return add_task(req.title, req.priority)

    @app.post("/tasks/complete")
    async def mark_task_complete(req: TaskCompleteRequest) -> dict[str, Any]:
        res = complete_task(req.task_id)
        if not res:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"success": True, "task": res}


def start_server() -> None:
    if not HAS_FASTAPI:
        print("[!] FastAPI and Uvicorn are required to run the HTTP REST server.")
        print("[!] Install them using: pip install fastapi uvicorn")
        sys.exit(1)

    print(f"[*] Launching JARVIS Zero-LLM REST Server on http://{HOST}:{PORT}...")
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False)


if __name__ == "__main__":
    start_server()
