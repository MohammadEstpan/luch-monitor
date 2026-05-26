import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from config import WAZUH

_executor = ThreadPoolExecutor(max_workers=2)
_token: str | None = None
_token_ts: float = 0
TOKEN_TTL = 850  # Wazuh JWT expires in ~900s


def _get_token() -> str:
    global _token, _token_ts
    if _token and (time.time() - _token_ts) < TOKEN_TTL:
        return _token
    r = requests.get(
        f"https://{WAZUH['host']}:{WAZUH['port']}/security/user/authenticate",
        auth=(WAZUH["user"], WAZUH["password"]),
        verify=False,
        timeout=10,
    )
    r.raise_for_status()
    _token = r.json()["data"]["token"]
    _token_ts = time.time()
    return _token


def _headers() -> dict:
    return {"Authorization": f"Bearer {_get_token()}"}


def _fetch_wazuh_sync() -> dict:
    base = f"https://{WAZUH['host']}:{WAZUH['port']}"
    h = _headers()

    agents_r = requests.get(f"{base}/agents?limit=500&select=id,name,status,ip,group,lastKeepAlive",
                            headers=h, verify=False, timeout=15)
    agents_r.raise_for_status()
    agents_data = agents_r.json()["data"]
    agents = agents_data.get("affected_items", [])

    total     = agents_data.get("total_affected_items", 0)
    active    = sum(1 for a in agents if a.get("status") == "active")
    disconnected = sum(1 for a in agents if a.get("status") == "disconnected")
    never_connected = sum(1 for a in agents if a.get("status") == "never_connected")

    alerts_r = requests.get(
        f"{base}/alerts?limit=50&sort=-timestamp&pretty=false",
        headers=h, verify=False, timeout=15,
    )
    recent_alerts: list[dict] = []
    crit_count = 0
    warn_count = 0
    if alerts_r.ok:
        for a in alerts_r.json().get("data", {}).get("affected_items", []):
            level = int(a.get("rule", {}).get("level", 0))
            sev = "crit" if level >= 12 else "warn" if level >= 7 else "info"
            if sev == "crit":
                crit_count += 1
            elif sev == "warn":
                warn_count += 1
            recent_alerts.append({
                "id": a.get("id", ""),
                "sev": sev,
                "level": level,
                "rule": a.get("rule", {}).get("description", ""),
                "agent": a.get("agent", {}).get("name", ""),
                "group": a.get("agent", {}).get("group", [""])[0] if a.get("agent", {}).get("group") else "",
                "ts": a.get("timestamp", ""),
            })

    groups_r = requests.get(f"{base}/groups?limit=100", headers=h, verify=False, timeout=10)
    groups: list[dict] = []
    if groups_r.ok:
        for g in groups_r.json().get("data", {}).get("affected_items", []):
            groups.append({"name": g.get("name", ""), "agents": g.get("count", 0)})

    return {
        "agents_total": total,
        "agents_active": active,
        "agents_disconnected": disconnected,
        "agents_never_connected": never_connected,
        "alerts_crit": crit_count,
        "alerts_warn": warn_count,
        "recent_alerts": recent_alerts[:20],
        "groups": groups,
        "agents": [
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "ip": a.get("ip"),
                "status": a.get("status"),
                "group": a.get("group", [""])[0] if a.get("group") else "",
                "last_seen": a.get("lastKeepAlive"),
            }
            for a in agents
            if a.get("id") != "000"
        ],
    }


async def collect_wazuh() -> dict:
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_executor, _fetch_wazuh_sync)
    except Exception as e:
        print(f"[wazuh] error: {e}")
        return {"error": str(e), "agents_total": 0, "agents_active": 0, "recent_alerts": []}
