"""
JARVIS Autonomous Bot Engine - Main Entry Point
Zero-AI / Zero-LLM Deterministic Architecture
"""
from __future__ import annotations

import argparse
import sys
import time

from config import SYSTEM_NAME, USER_TITLE
from core.intent_router import process_command

# Expose FastAPI application instance for Vercel Services entrypoint
try:
    from server import app
except Exception:
    app = None


def run_cli() -> None:
    print("=" * 65)
    print(f"      {SYSTEM_NAME}: AUTONOMOUS DETERMINISTIC CORE v2.0")
    print(f"      Status: Online | Target: {USER_TITLE} | Model: Zero-LLM (Instant)")
    print("=" * 65)
    print("Type commands (e.g. 'status', 'cpu', 'sleep', 'add task Fix bridge p4', 'tasks', 'exit')\n")

    # Initial greeting/status
    init_res = process_command("status")
    print(f"[{SYSTEM_NAME}] {init_res.speech}\n")

    while True:
        try:
            cmd = input(f"{SYSTEM_NAME} [{USER_TITLE}] > ").strip()
            if not cmd:
                continue
            if cmd.lower() in ["exit", "quit", "q", "shutdown"]:
                print(f"[{SYSTEM_NAME}] Subsystems standing down. Good rest, {USER_TITLE}.")
                break

            t0 = time.perf_counter()
            response = process_command(cmd)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0

            print(f"[{SYSTEM_NAME}] {response.speech}  [Latency: {elapsed_ms:.2f}ms]\n")

        except (KeyboardInterrupt, EOFError):
            print(f"\n[{SYSTEM_NAME}] Session terminated.")
            break


def main() -> None:
    parser = argparse.ArgumentParser(description=f"{SYSTEM_NAME} Autonomous Core Engine")
    parser.add_argument("command", nargs="*", help="Optional single command to execute directly")
    parser.add_argument("--server", action="store_true", help="Launch the FastAPI REST API server")
    parser.add_argument("--voice", action="store_true", help="Enable OS-native speech synthesizer output")
    args = parser.parse_args()

    if args.server:
        from server import start_server
        start_server()
        return

    if args.command:
        full_cmd = " ".join(args.command)
        res = process_command(full_cmd, voice_enabled=args.voice)
        print(res.speech)
        return

    run_cli()


if __name__ == "__main__":
    main()
