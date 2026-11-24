"""
JARVIS Platform Voice Engine
Provides authoritative zero-latency voice delivery using OS-native speech synthesis.
"""
from __future__ import annotations

import os
import subprocess
import sys


def speak(text: str, wait: bool = False) -> None:
    if not text:
        return

    # Windows Speech Synthesis via PowerShell System.Speech (zero extra dependencies required)
    if sys.platform == "win32":
        sanitized = text.replace('"', '""').replace("'", "''")
        cmd = (
            f"Add-Type -AssemblyName System.Speech; "
            f"$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"$s.Rate = 1; "
            f"$s.Speak('{sanitized}')"
        )
        try:
            if wait:
                subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True)
            else:
                subprocess.Popen(["powershell", "-NoProfile", "-Command", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass


def alert_beep(frequency: int = 1000, duration_ms: int = 300) -> None:
    if sys.platform == "win32":
        try:
            import winsound
            winsound.Beep(frequency, duration_ms)
        except Exception:
            pass
