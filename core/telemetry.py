"""
JARVIS System Telemetry Engine
Monitors host hardware resources with zero external LLM dependencies.
"""
from __future__ import annotations

import time
from typing import Any

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


def get_hardware_telemetry() -> dict[str, Any]:
    if not HAS_PSUTIL:
        return {
            "available": False,
            "error": "psutil not installed",
            "cpu_percent": 0.0,
            "ram_used_gb": 0.0,
            "ram_total_gb": 0.0,
            "ram_percent": 0.0,
            "battery_percent": None,
            "power_plugged": None,
            "boot_time": None,
        }

    vm = psutil.virtual_memory()
    battery = psutil.sensors_battery()
    disk = psutil.disk_usage("/")

    return {
        "available": True,
        "cpu_percent": psutil.cpu_percent(interval=None),
        "ram_used_gb": round(vm.used / (1024**3), 2),
        "ram_total_gb": round(vm.total / (1024**3), 2),
        "ram_percent": vm.percent,
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "disk_percent": disk.percent,
        "battery_percent": battery.percent if battery is not None else None,
        "power_plugged": battery.power_plugged if battery is not None else None,
        "boot_time": int(psutil.boot_time()),
        "timestamp": time.time(),
    }


def format_telemetry_speech(telemetry: dict[str, Any]) -> str:
    if not telemetry.get("available"):
        return "Telemetry offline, Boss. Hardware monitoring module requires psutil."

    cpu = telemetry["cpu_percent"]
    ram_used = telemetry["ram_used_gb"]
    ram_total = telemetry["ram_total_gb"]
    ram_pct = telemetry["ram_percent"]
    battery = telemetry["battery_percent"]

    battery_str = f" Battery: {battery:.0f}%." if battery is not None else ""
    return (
        f"Telemetry online, Boss. CPU load: {cpu}%. Memory allocation: {ram_used} of "
        f"{ram_total} GB ({ram_pct}%).{battery_str} All subsystems operating within parameters."
    )
