"""
JARVIS Distraction Shield Module
Restricts entertainment and distraction vectors during active focus/work blocks.
Zero external AI dependencies.
"""
from __future__ import annotations

import os
import sys
from typing import Any

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

# Default entertainment and distraction process vectors on host PC
DEFAULT_BLACKLIST = [
    "spotify.exe",
    "discord.exe",
    "steam.exe",
    "epicgameslauncher.exe",
    "telegram.exe",
    "netflix.exe",
    "tiktok.exe",
]

_shield_active: bool = False
_active_work_block: str | None = None
_breaches_detected: int = 0


def is_shield_active() -> bool:
    return _shield_active


def get_shield_status() -> dict[str, Any]:
    active_breaches = scan_for_distractions() if _shield_active else []
    return {
        "active": _shield_active,
        "mode": "Active Work Block" if _shield_active else "Standby",
        "current_work_block": _active_work_block,
        "breaches_detected_total": _breaches_detected,
        "active_distractions_running": active_breaches,
        "monitored_vectors": DEFAULT_BLACKLIST,
    }


def toggle_shield(enable: bool, work_block_label: str | None = None) -> dict[str, Any]:
    global _shield_active, _active_work_block
    _shield_active = enable
    _active_work_block = work_block_label if enable else None
    return get_shield_status()


def scan_for_distractions() -> list[str]:
    if not HAS_PSUTIL:
        return []
    running_distractions = []
    for proc in psutil.process_iter(["name"]):
        try:
            name = (proc.info.get("name") or "").lower()
            if name in DEFAULT_BLACKLIST and name not in running_distractions:
                running_distractions.append(name)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return running_distractions


def enforce_shield() -> dict[str, Any]:
    global _breaches_detected
    if not _shield_active or not HAS_PSUTIL:
        return {"enforced": False, "terminated": []}

    terminated = []
    for proc in psutil.process_iter(["name"]):
        try:
            name = (proc.info.get("name") or "").lower()
            if name in DEFAULT_BLACKLIST:
                proc.terminate()
                terminated.append(name)
                _breaches_detected += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    return {
        "enforced": True,
        "terminated": terminated,
        "total_breaches": _breaches_detected,
    }
