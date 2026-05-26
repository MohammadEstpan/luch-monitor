import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

import requests

_executor = ThreadPoolExecutor(max_workers=2)

NVR_LIST = [
    {"branch_id": 202, "ip": "192.168.104.101", "name": "Perm-2",          "cred": ("admin", "IzaTfRaG")},
    {"branch_id": 204, "ip": "192.168.15.200",  "name": "Chel-Moldavsk",   "cred": ("admin", "IzaTfRaG")},
    {"branch_id": 232, "ip": "192.168.2.101",   "name": "Kopeisk",         "cred": ("admin", "IzaTfRaG")},
    {"branch_id": 248, "ip": "192.168.248.101",  "name": "New-Urengoy",     "cred": ("admin", "IzaTfRaG")},
    {"branch_id": 50,  "ip": "192.168.105.200",  "name": "Orsk",            "cred": ("admin", "IzaTfRaG")},
    {"branch_id": 99,  "ip": "192.168.99.101",   "name": "Chelsi",          "cred": ("admin", "IzaTfRaG")},
    {"branch_id": 177, "ip": "192.168.39.102",   "name": "Ufa-3",           "cred": ("admin", "IzaTfRaG")},
    {"branch_id": 246, "ip": "192.168.0.210",    "name": "Magnitogorsk-LTV","cred": ("admin", "Flvby_106")},
    {"branch_id": 240, "ip": "192.168.94.101",   "name": "Orenburg",        "cred": ("admin", "Flvby_106")},
    {"branch_id": 187, "ip": "192.168.21.240",   "name": "Kurgan",          "cred": ("admin", "Flvby_106")},
    {"branch_id": 152, "ip": "192.168.42.101",   "name": "Miass",           "cred": ("admin", "Flvby_106")},
]

RPCPORT = 9786


def _probe_nvr(nvr: dict) -> dict:
    ip = nvr["ip"]
    user, pwd = nvr["cred"]
    try:
        payload = json.dumps({"method": "get_version", "params": {}, "id": 1})
        r = requests.post(
            f"http://{ip}:{RPCPORT}/rpc",
            data=payload,
            headers={"Content-Type": "application/json"},
            auth=(user, pwd),
            timeout=5,
        )
        if r.ok and "result" in r.json():
            result = r.json()["result"]
            return {
                **nvr,
                "status": "ok",
                "firmware": result.get("firmware_version", ""),
                "channels": result.get("channels_count", 0),
                "cred": None,
            }
    except Exception:
        pass
    return {**nvr, "status": "crit", "firmware": None, "channels": None, "cred": None}


def _fetch_nvrs_sync() -> list[dict]:
    return [_probe_nvr(n) for n in NVR_LIST]


async def collect_nvrs() -> list[dict]:
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_executor, _fetch_nvrs_sync)
    except Exception as e:
        print(f"[nvr] error: {e}")
        return []
