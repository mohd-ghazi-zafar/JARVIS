from __future__ import annotations

import json
import sys
import time

import httpx

BRAIN_URL = "http://127.0.0.1:8000"


def _print_result(data: dict, latency_s: float) -> None:
    bridge = data.get("bridge_status", {})
    payload = data.get("payload", {})
    metrics = data.get("metrics") or {}
    inference_s = metrics.get("inference_s")
    tps = metrics.get("tokens_per_sec")
    latency_detail = f"{latency_s:.3f}s"
    if inference_s is not None and tps is not None:
        latency_detail += f" (LLM: {inference_s:.3f}s, {tps:.2f} tok/s)"
    print(f"  Inference Latency     : {latency_detail}")
    print(f"  Model Reasoning       : {data.get('thought', '')}")
    print(f"  Target Action         : {data.get('action', '')}")
    print(f"  Action Payload        : {json.dumps(payload)}")
    print(
        f"  Bridge Dispatch Status: {bridge.get('status', 'unknown')} "
        f"(dispatched={bridge.get('dispatched', False)}, "
        f"endpoint={bridge.get('endpoint')}, detail={bridge.get('detail')})"
    )


def main() -> int:
    print("Jarvis Brain Interactive Console (type 'exit' or 'quit' to leave)")
    with httpx.Client(base_url=BRAIN_URL, timeout=120.0) as client:
        while True:
            try:
                user_input = input("Boss > ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nExiting Jarvis console.")
                return 0

            if not user_input:
                continue
            if user_input.lower() in {"exit", "quit"}:
                print("Exiting Jarvis console.")
                return 0

            start = time.perf_counter()
            try:
                response = client.post("/decide", json={"user_input": user_input})
                latency_s = time.perf_counter() - start
            except httpx.HTTPError as exc:
                latency_s = time.perf_counter() - start
                print(f"  Request failed after {latency_s:.3f}s: {exc}")
                continue

            if response.status_code != 200:
                print(f"  Server error HTTP {response.status_code} ({latency_s:.3f}s): {response.text}")
                continue

            try:
                data = response.json()
            except ValueError as exc:
                print(f"  Invalid JSON response ({latency_s:.3f}s): {exc}")
                continue

            _print_result(data, latency_s)


if __name__ == "__main__":
    sys.exit(main())

