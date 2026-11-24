"""
JARVIS Web Server & Static HUD Verification Test
"""
import json
from pathlib import Path
import sys
import threading
import time
import urllib.request

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from config import HOST, PORT
from server import JarvisHTTPRequestHandler, ThreadingHTTPServer


def test_server() -> None:
    print("=" * 65)
    print("    JARVIS WEB HUD & REST SERVER TEST SUITE")
    print("=" * 65)

    server = ThreadingHTTPServer((HOST, PORT), JarvisHTTPRequestHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.5)

    base_url = f"http://127.0.0.1:{PORT}"

    # 1. Test Static Web Assets
    print("[*] 1. Validating Web HUD Static Assets...")
    html = urllib.request.urlopen(f"{base_url}/").read().decode("utf-8")
    assert "JARVIS" in html and "ticks-canvas" in html
    print("   -> [PASS] GET / (index.html contains dial & HUD markup)")

    css = urllib.request.urlopen(f"{base_url}/style.css").read().decode("utf-8")
    assert "breathingPulse" in css and "rotateClockwise" in css
    print("   -> [PASS] GET /style.css (contains GPU animations & warm luxury styles)")

    js = urllib.request.urlopen(f"{base_url}/app.js").read().decode("utf-8")
    assert "renderDialTicks" in js and "renderIslandIcon" in js
    print("   -> [PASS] GET /app.js (contains procedural tick math & boolean moon)")

    # 2. Test REST API Endpoints
    print("\n[*] 2. Validating REST API Endpoints...")
    telem = json.loads(urllib.request.urlopen(f"{base_url}/telemetry").read().decode("utf-8"))
    assert "cpu_percent" in telem
    print(f"   -> [PASS] GET /telemetry (CPU: {telem['cpu_percent']}%, RAM: {telem['ram_percent']}%)")

    circ = json.loads(urllib.request.urlopen(f"{base_url}/circadian").read().decode("utf-8"))
    assert circ["bedtime_target"] == "01:30"
    print(f"   -> [PASS] GET /circadian (Target: {circ['bedtime_target']}, Countdown: {circ['bedtime_countdown']})")

    shield = json.loads(urllib.request.urlopen(f"{base_url}/shield/status").read().decode("utf-8"))
    assert "active" in shield
    print(f"   -> [PASS] GET /shield/status (Active: {shield['active']}, Monitored: {len(shield['monitored_vectors'])})")

    # 3. Test Command Execution
    req = urllib.request.Request(
        f"{base_url}/command",
        data=json.dumps({"command": "report status"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    cmd_res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    assert "Boss" in cmd_res["speech"]
    print(f"   -> [PASS] POST /command ('report status' returned speech: '{cmd_res['speech'][:50]}...')")

    server.shutdown()
    print("-" * 65)
    print("Summary: All static frontend assets and REST endpoints verified!")
    print("=" * 65)


if __name__ == "__main__":
    test_server()
