"""
JARVIS Autonomous REST Server & HUD Host
High-speed, zero-LLM deterministic system core.
Serves both the REST API and the luxury hardware-accelerated Web HUD.
Works with FastAPI/Uvicorn if installed, or falls back seamlessly to Python's built-in HTTP server with zero dependencies.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys
import threading
from typing import Any
import urllib.parse

from config import HOST, PORT
from core.analytics import generate_evening_summary
from core.circadian import get_circadian_status
from core.intent_router import process_command
from core.shield import enforce_shield, get_shield_status, toggle_shield
from core.tasks import add_task, complete_task, get_daily_metrics, list_tasks
from core.telemetry import get_hardware_telemetry

WEB_DIR = Path(__file__).resolve().parent / "web"

try:
    from fastapi import FastAPI, HTTPException, APIRouter
    from fastapi.staticfiles import StaticFiles
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
    api_router = APIRouter()

    class CommandRequest(BaseModel):
        command: str = Field(..., min_length=1)
        voice: bool = False

    class TaskAddRequest(BaseModel):
        title: str = Field(..., min_length=1)
        priority: int = Field(2, ge=1, le=4)

    class TaskCompleteRequest(BaseModel):
        task_id: int

    @api_router.get("/health")
    async def health() -> dict[str, str]:
        return {
            "status": "online",
            "system": "JARVIS Zero-LLM Core",
            "latency": "<1ms",
        }

    @api_router.post("/command")
    async def execute_command(req: CommandRequest) -> dict[str, Any]:
        result = process_command(req.command, voice_enabled=req.voice)
        return result.to_dict()

    @api_router.get("/telemetry")
    async def telemetry() -> dict[str, Any]:
        return get_hardware_telemetry()

    @api_router.get("/circadian")
    async def circadian() -> dict[str, Any]:
        return get_circadian_status()

    @api_router.get("/tasks")
    async def tasks() -> dict[str, Any]:
        return {
            "tasks": list_tasks(include_completed=False),
            "metrics": get_daily_metrics(),
        }

    @api_router.post("/tasks")
    async def create_task(req: TaskAddRequest) -> dict[str, Any]:
        return add_task(req.title, req.priority)

    @api_router.post("/tasks/complete")
    async def mark_task_complete(req: TaskCompleteRequest) -> dict[str, Any]:
        res = complete_task(req.task_id)
        if not res:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"success": True, "task": res}

    @api_router.get("/shield/status")
    async def shield_status() -> dict[str, Any]:
        return get_shield_status()

    @api_router.post("/shield/toggle")
    async def shield_toggle(enabled: bool = True, label: str = "Focus Work Block") -> dict[str, Any]:
        status = toggle_shield(enabled, work_block_label=label)
        enforce = enforce_shield() if enabled else {}
        return {"shield": status, "enforcement": enforce}

    @api_router.get("/analytics/summary")
    async def analytics_summary() -> dict[str, Any]:
        return generate_evening_summary()

    # Reconcile public paths: support /api/ prefix (Vercel rewrite) and root / prefix (local)
    app.include_router(api_router, prefix="/api")
    app.include_router(api_router)

    if WEB_DIR.exists():
        app.mount("/hud", StaticFiles(directory=str(WEB_DIR), html=True), name="hud")


# ==========================================================================
# Built-in Standard Library Multi-Threaded HTTP Server (Zero Dependencies)
# ==========================================================================
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class JarvisHTTPRequestHandler(BaseHTTPRequestHandler):
    server_version = "JarvisCore/2.0"

    def _set_cors_headers(self, content_type: str = "application/json") -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Content-Type", content_type)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def _send_json(self, status_code: int, data: dict[str, Any]) -> None:
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status_code)
        self._set_cors_headers("application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, file_path: Path, mime_type: str) -> None:
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self._set_cors_headers(mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def do_GET(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        if path.startswith("/api/"):
            path = "/" + path[5:]

        # Static File Routing
        if path in ["/", "/index.html"]:
            index_path = WEB_DIR / "index.html"
            if index_path.exists():
                return self._serve_file(index_path, "text/html")
        elif path == "/style.css":
            css_path = WEB_DIR / "style.css"
            if css_path.exists():
                return self._serve_file(css_path, "text/css")
        elif path == "/app.js":
            js_path = WEB_DIR / "app.js"
            if js_path.exists():
                return self._serve_file(js_path, "application/javascript")

        # REST API Routes
        if path == "/health":
            return self._send_json(200, {
                "status": "online",
                "system": "JARVIS Zero-LLM Core",
                "latency": "<1ms",
            })
        elif path == "/telemetry":
            return self._send_json(200, get_hardware_telemetry())
        elif path == "/circadian":
            return self._send_json(200, get_circadian_status())
        elif path == "/tasks":
            return self._send_json(200, {
                "tasks": list_tasks(include_completed=False),
                "metrics": get_daily_metrics(),
            })
        elif path == "/shield/status":
            return self._send_json(200, get_shield_status())
        elif path == "/analytics/summary":
            return self._send_json(200, generate_evening_summary())

        # Check if file exists in WEB_DIR
        safe_rel = path.lstrip("/")
        candidate = WEB_DIR / safe_rel
        if candidate.exists() and candidate.is_file():
            mime = "text/plain"
            if candidate.suffix == ".html":
                mime = "text/html"
            elif candidate.suffix == ".css":
                mime = "text/css"
            elif candidate.suffix == ".js":
                mime = "application/javascript"
            elif candidate.suffix in [".png", ".jpg", ".jpeg", ".ico"]:
                mime = f"image/{candidate.suffix.lstrip('.')}"
            return self._serve_file(candidate, mime)

        self._send_json(404, {"error": "Route not found", "path": path})

    def do_POST(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        if path.startswith("/api/"):
            path = "/" + path[5:]

        # Read JSON payload if present
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""
        payload = {}
        if body:
            try:
                payload = json.loads(body.decode("utf-8"))
            except Exception:
                payload = {}

        if path == "/command":
            cmd = payload.get("command", "").strip()
            voice = bool(payload.get("voice", False))
            if not cmd:
                return self._send_json(400, {"error": "Missing 'command' parameter"})
            res = process_command(cmd, voice_enabled=voice)
            return self._send_json(200, res.to_dict())

        elif path == "/tasks":
            title = payload.get("title", "").strip()
            priority = int(payload.get("priority", 2))
            if not title:
                return self._send_json(400, {"error": "Missing 'title' parameter"})
            task = add_task(title, priority=priority)
            return self._send_json(200, task)

        elif path == "/tasks/complete":
            task_id = payload.get("task_id")
            if task_id is None:
                return self._send_json(400, {"error": "Missing 'task_id' parameter"})
            task = complete_task(int(task_id))
            if not task:
                return self._send_json(404, {"error": "Task not found"})
            return self._send_json(200, {"success": True, "task": task})

        elif path == "/shield/toggle":
            query = urllib.parse.parse_qs(parsed_url.query)
            enabled_str = query.get("enabled", ["true"])[0].lower()
            enabled = enabled_str in ["true", "1", "yes"]
            label = query.get("label", ["Focus Work Block"])[0]

            status = toggle_shield(enabled, work_block_label=label)
            enforce = enforce_shield() if enabled else {}
            return self._send_json(200, {"shield": status, "enforcement": enforce})

        self._send_json(404, {"error": "Route not found", "path": path})

    def log_message(self, format: str, *args: Any) -> None:
        # Silent or concise logging to avoid console spam
        pass


def start_server() -> None:
    display_host = "localhost" if HOST in ["0.0.0.0", "::"] else HOST
    print("=" * 65)
    print("    JARVIS AUTONOMOUS ENGINE & HUD SERVER")
    print("=" * 65)
    print(f"[*] Core Architecture : Zero-LLM Deterministic (< 1ms Latency)")
    print(f"[*] Server Bound       : {HOST}:{PORT}")
    print(f"[*] Frontend Web HUD   : http://{display_host}:{PORT}/")
    print(f"[*] Local Loopback URL : http://127.0.0.1:{PORT}/")
    print("=" * 65)

    if HAS_FASTAPI:
        print("[*] Running with FastAPI & Uvicorn engine...")
        uvicorn.run("server:app", host=HOST, port=PORT, reload=False)
    else:
        print("[*] Running with Python Built-in Multi-Threaded HTTP Engine...")
        server = ThreadingHTTPServer((HOST, PORT), JarvisHTTPRequestHandler)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n[*] Shutting down JARVIS Server.")
            server.server_close()


if __name__ == "__main__":
    start_server()
