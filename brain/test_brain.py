from __future__ import annotations

from dataclasses import dataclass
import json
import sys
import time
from typing import Callable

import httpx

from server import BrainDecision

BRAIN_URL = "http://127.0.0.1:8000"


@dataclass
class TestCase:
    name: str
    user_input: str
    validator: Callable[[BrainDecision], tuple[bool, str]]


@dataclass
class TestResult:
    name: str
    passed: bool
    latency_s: float
    detail: str
    raw_json: dict | None = None


def _contains_backticks(value: object) -> bool:
    if isinstance(value, str):
        return "```" in value
    if isinstance(value, dict):
        return any(_contains_backticks(v) for v in value.values())
    if isinstance(value, list):
        return any(_contains_backticks(v) for v in value)
    return False


def _validate_tap(decision: BrainDecision) -> tuple[bool, str]:
    ok = (
        decision.action == "tap"
        and decision.payload.x == 950.0
        and decision.payload.y == 120.0
    )
    msg = f"action={decision.action}, x={decision.payload.x}, y={decision.payload.y}"
    return ok, msg


def _validate_type(decision: BrainDecision) -> tuple[bool, str]:
    expected = "reviewing the repository now"
    actual = decision.payload.text.strip()
    ok = decision.action == "type" and expected in actual.lower()
    msg = f"action={decision.action}, text={actual!r}"
    return ok, msg


def _validate_speak(decision: BrainDecision) -> tuple[bool, str]:
    actual = decision.payload.text.strip()
    ok = decision.action == "speak" and bool(actual)
    msg = f"action={decision.action}, text={actual!r}"
    return ok, msg


def _validate_telemetry(decision: BrainDecision) -> tuple[bool, str]:
    ok = decision.action == "inspect_system" and decision.payload.telemetry is not None
    telem = decision.payload.telemetry or {}
    msg = f"action={decision.action}, cpu={telem.get('cpu_percent')}%, ram={telem.get('ram_used_gb')}GB"
    return ok, msg


def _print_table(results: list[TestResult]) -> None:
    name_w = max(len("Test Case"), *(len(r.name) for r in results))
    status_w = 6
    lat_w = 10
    detail_w = 56

    sep = f"+-{'-' * name_w}-+-{'-' * status_w}-+-{'-' * lat_w}-+-{'-' * detail_w}-+"
    header = (
        f"| {'Test Case'.ljust(name_w)} "
        f"| {'Status'.ljust(status_w)} "
        f"| {'Latency'.rjust(lat_w)} "
        f"| {'Details'.ljust(detail_w)} |"
    )

    print()
    print(sep)
    print(header)
    print(sep)
    for res in results:
        status = "PASS" if res.passed else "FAIL"
        lat = f"{res.latency_s:.3f}s" if res.latency_s > 0 else "N/A"
        detail = res.detail
        if len(detail) > detail_w:
            detail = detail[: detail_w - 3] + "..."
        print(
            f"| {res.name.ljust(name_w)} "
            f"| {status.ljust(status_w)} "
            f"| {lat.rjust(lat_w)} "
            f"| {detail.ljust(detail_w)} |"
        )
    print(sep)


def main() -> int:
    cases = [
        TestCase(
            name="Test 1: Tap Action",
            user_input="Tap the direct message icon located at x 950 and y 120.",
            validator=_validate_tap,
        ),
        TestCase(
            name="Test 2: Typing Action",
            user_input="Type 'Reviewing the repository now' into the current text field.",
            validator=_validate_type,
        ),
        TestCase(
            name="Test 3: Authoritative Speech Action",
            user_input="Jarvis, report status and schedule compliance.",
            validator=_validate_speak,
        ),
        TestCase(
            name="Test 4: Hardware Telemetry Action",
            user_input="Check current CPU and memory allocation.",
            validator=_validate_telemetry,
        ),
    ]

    results: list[TestResult] = []
    schema_failures: list[str] = []

    with httpx.Client(base_url=BRAIN_URL, timeout=120.0) as client:
        health = client.get("/health")
        if health.status_code != 200:
            print(f"Health check failed: HTTP {health.status_code} {health.text}")
            return 1
        print(f"Brain Health: {health.status_code} {health.json()}")

        # Run inference decision test cases
        for case in cases:
            start = time.perf_counter()
            try:
                resp = client.post("/decide", json={"user_input": case.user_input})
                latency = time.perf_counter() - start
            except httpx.HTTPError as exc:
                latency = time.perf_counter() - start
                results.append(
                    TestResult(
                        name=case.name,
                        passed=False,
                        latency_s=latency,
                        detail=f"HTTP request failed: {exc}",
                    )
                )
                schema_failures.append(f"{case.name}: request error ({exc})")
                continue

            if resp.status_code != 200:
                results.append(
                    TestResult(
                        name=case.name,
                        passed=False,
                        latency_s=latency,
                        detail=f"HTTP {resp.status_code}: {resp.text}",
                    )
                )
                schema_failures.append(f"{case.name}: HTTP {resp.status_code}")
                continue

            try:
                raw_json = json.loads(resp.text)
                decision = BrainDecision.model_validate(raw_json)
                if _contains_backticks(raw_json) or "```" in resp.text:
                    schema_failures.append(f"{case.name}: leaked markdown backticks")
            except Exception as exc:
                results.append(
                    TestResult(
                        name=case.name,
                        passed=False,
                        latency_s=latency,
                        detail=f"JSON/Schema validation failed: {exc}",
                    )
                )
                schema_failures.append(f"{case.name}: {exc}")
                continue

            passed, detail = case.validator(decision)
            results.append(
                TestResult(
                    name=case.name,
                    passed=passed,
                    latency_s=latency,
                    detail=detail,
                    raw_json=raw_json,
                )
            )

        # Test 5: Dynamic Task Prioritizer Module
        start = time.perf_counter()
        try:
            add_resp = client.post("/task/add", json={"title": "Refactor IPC Bridge", "priority": 4})
            task_id = add_resp.json().get("task", {}).get("id")
            list_resp = client.get("/task/list")
            comp_resp = client.post("/task/complete", json={"task_id": task_id})
            t_lat = time.perf_counter() - start
            task_ok = (
                add_resp.status_code == 200
                and list_resp.status_code == 200
                and comp_resp.status_code == 200
                and comp_resp.json().get("task", {}).get("status") == "completed"
            )
            results.append(
                TestResult(
                    name="Test 5: Task Prioritizer Module",
                    passed=task_ok,
                    latency_s=t_lat,
                    detail=f"Ingested task #{task_id} (Priority 4), listed tasks, completed task",
                    raw_json=comp_resp.json(),
                )
            )
        except Exception as exc:
            results.append(
                TestResult(
                    name="Test 5: Task Prioritizer Module",
                    passed=False,
                    latency_s=0.0,
                    detail=f"Task API error: {exc}",
                )
            )

        # Test 6: Daily Analytics Engine Summary
        start = time.perf_counter()
        try:
            summary_resp = client.get("/analytics/summary")
            s_lat = time.perf_counter() - start
            sum_data = summary_resp.json()
            metrics = sum_data.get("metrics", {})
            summary_ok = (
                summary_resp.status_code == 200
                and "completion_rate_pct" in metrics
                and "adherence_score_pct" in metrics
            )
            results.append(
                TestResult(
                    name="Test 6: Daily Analytics Summary",
                    passed=summary_ok,
                    latency_s=s_lat,
                    detail=f"Completion: {metrics.get('completion_rate_pct')}%, Adherence: {metrics.get('adherence_score_pct')}%, Strictness: {metrics.get('recommended_strictness_level')}",
                    raw_json=sum_data,
                )
            )
        except Exception as exc:
            results.append(
                TestResult(
                    name="Test 6: Daily Analytics Summary",
                    passed=False,
                    latency_s=0.0,
                    detail=f"Analytics summary error: {exc}",
                )
            )

    schema_passed = len(schema_failures) == 0 and len(results) >= len(cases)
    schema_detail = (
        f"All {len(cases)} LLM responses valid BrainDecision JSON (0 backtick leaks)"
        if schema_passed
        else "; ".join(schema_failures)
    )
    results.append(
        TestResult(
            name="Test 7: Schema Robustness",
            passed=schema_passed,
            latency_s=0.0,
            detail=schema_detail,
        )
    )

    _print_table(results)

    print("\nDetailed Responses:")
    for res in results:
        if res.raw_json is not None:
            print(f"\n--- {res.name} ({res.latency_s:.3f}s) ---")
            print(json.dumps(res.raw_json, indent=2))

    inference_latencies = [r.latency_s for r in results[: len(cases)] if r.latency_s > 0]
    total_lat = sum(inference_latencies)
    avg_lat = total_lat / len(inference_latencies) if inference_latencies else 0.0
    passed_count = sum(1 for r in results if r.passed)

    print(
        f"\nSummary: {passed_count}/{len(results)} tests passed | "
        f"Total LLM HTTP latency: {total_lat:.3f}s | Avg LLM latency: {avg_lat:.3f}s"
    )
    return 0 if passed_count == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
