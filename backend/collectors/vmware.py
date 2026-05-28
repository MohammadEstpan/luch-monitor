"""VMware vCenter REST API collector — reads VM inventory."""
import asyncio
from concurrent.futures import ThreadPoolExecutor

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from config import VCENTER

_executor = ThreadPoolExecutor(max_workers=2)
_session_id: str | None = None


def _login(base: str) -> str:
    r = requests.post(
        f"{base}/api/session",
        auth=(VCENTER["user"], VCENTER["password"]),
        verify=False, timeout=10,
    )
    r.raise_for_status()
    return r.json()  # returns session token string


def _fetch_sync() -> list[dict]:
    if not VCENTER.get("host"):
        return []
    base = f"https://{VCENTER['host']}/api"
    global _session_id

    headers = {}
    if _session_id:
        headers["vmware-api-session-id"] = _session_id
    else:
        try:
            _session_id = _login(base)
            headers["vmware-api-session-id"] = _session_id
        except Exception as e:
            print(f"[vmware] login failed: {e}")
            return []

    try:
        r = requests.get(f"{base}/vcenter/vm", headers=headers, verify=False, timeout=15)
        if r.status_code == 401:
            # Session expired — re-login
            _session_id = _login(base)
            headers["vmware-api-session-id"] = _session_id
            r = requests.get(f"{base}/vcenter/vm", headers=headers, verify=False, timeout=15)
        r.raise_for_status()
        vms = r.json()
        return [
            {
                "name": vm.get("name", ""),
                "id": vm.get("vm", ""),
                "power": vm.get("power_state", "unknown").lower(),
                "cpu": vm.get("cpu_count", 0),
                "mem_mb": vm.get("memory_size_MiB", 0),
                "org": "luch",
                "status": "ok" if vm.get("power_state") == "POWERED_ON" else "muted",
            }
            for vm in (vms if isinstance(vms, list) else [])
        ]
    except Exception as e:
        print(f"[vmware] fetch error: {e}")
        _session_id = None
        return []


async def collect_vmware() -> list[dict]:
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_executor, _fetch_sync)
    except Exception as e:
        print(f"[vmware] collect error: {e}")
        return []
