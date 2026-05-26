import asyncio
from concurrent.futures import ThreadPoolExecutor

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from config import UNIFI

_executor = ThreadPoolExecutor(max_workers=2)
_session: requests.Session | None = None


def _get_session() -> requests.Session:
    global _session
    if _session:
        try:
            r = _session.get(
                f"https://{UNIFI['host']}:{UNIFI['port']}/api/self",
                verify=False, timeout=5,
            )
            if r.ok:
                return _session
        except Exception:
            pass
    s = requests.Session()
    s.verify = False
    r = s.post(
        f"https://{UNIFI['host']}:{UNIFI['port']}/api/login",
        json={"username": UNIFI["user"], "password": UNIFI["password"]},
        timeout=10,
    )
    r.raise_for_status()
    _session = s
    return s


def _fetch_unifi_sync() -> dict:
    base = f"https://{UNIFI['host']}:{UNIFI['port']}"
    s = _get_session()

    devices_r = s.get(f"{base}/api/s/default/stat/device", timeout=15)
    devices_r.raise_for_status()
    devices = devices_r.json().get("data", [])

    aps = [d for d in devices if d.get("type") == "uap"]
    aps_up = sum(1 for a in aps if a.get("state") == 1)

    clients_r = s.get(f"{base}/api/s/default/stat/sta", timeout=15)
    clients = 0
    if clients_r.ok:
        clients = len(clients_r.json().get("data", []))

    ap_list = [
        {
            "name": a.get("name") or a.get("hostname", ""),
            "mac": a.get("mac", ""),
            "ip": a.get("ip", ""),
            "status": "ok" if a.get("state") == 1 else "crit",
            "model": a.get("model", ""),
            "clients": a.get("num_sta", 0),
            "uptime": a.get("uptime", 0),
            "tx_bytes": a.get("tx_bytes", 0),
            "rx_bytes": a.get("rx_bytes", 0),
        }
        for a in aps
    ]

    return {
        "aps_total": len(aps),
        "aps_up": aps_up,
        "clients": clients,
        "ap_list": ap_list,
    }


async def collect_unifi() -> dict:
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_executor, _fetch_unifi_sync)
    except Exception as e:
        print(f"[unifi] error: {e}")
        return {"error": str(e), "aps_total": 0, "aps_up": 0, "clients": 0, "ap_list": []}
