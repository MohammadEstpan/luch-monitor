"""Veeam Backup & Replication REST API collector."""
import asyncio
from concurrent.futures import ThreadPoolExecutor

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from config import VEEAM

_executor = ThreadPoolExecutor(max_workers=2)
_token: str | None = None


def _login(base: str) -> str:
    r = requests.post(
        f"{base}/api/oauth2/token",
        data={"grant_type": "password", "username": VEEAM["user"], "password": VEEAM["password"]},
        verify=False, timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _fetch_sync() -> dict:
    if not VEEAM.get("host"):
        return {"jobs": [], "sessions": []}
    base = f"https://{VEEAM['host']}:{VEEAM.get('port', 9419)}"
    global _token

    if not _token:
        try:
            _token = _login(base)
        except Exception as e:
            print(f"[veeam] login failed: {e}")
            return {"jobs": [], "sessions": []}

    headers = {"Authorization": f"Bearer {_token}", "x-api-version": "1.1-rev0"}

    try:
        # Backup jobs
        rj = requests.get(f"{base}/api/v1/jobs", headers=headers, verify=False, timeout=15)
        if rj.status_code == 401:
            _token = _login(base)
            headers["Authorization"] = f"Bearer {_token}"
            rj = requests.get(f"{base}/api/v1/jobs", headers=headers, verify=False, timeout=15)
        rj.raise_for_status()
        jobs_raw = rj.json().get("data", [])

        # Recent backup sessions (last 20)
        rs = requests.get(f"{base}/api/v1/backupSessions?limit=20&orderColumn=CreationTime&orderAsc=false",
                          headers=headers, verify=False, timeout=15)
        sessions_raw = rs.json().get("data", []) if rs.ok else []

        jobs = [
            {
                "id": j.get("id", ""),
                "name": j.get("name", ""),
                "type": j.get("type", ""),
                "status": _map_job_status(j.get("lastResult", "")),
                "last_run": j.get("lastRun", ""),
                "next_run": j.get("nextRun", ""),
                "org": "luch",
            }
            for j in jobs_raw
        ]

        sessions = [
            {
                "id": s.get("id", ""),
                "job_name": s.get("jobName", ""),
                "state": s.get("state", ""),
                "result": s.get("result", ""),
                "start": s.get("creationTime", ""),
                "end": s.get("endTime", ""),
                "progress": s.get("progressPercent", 0),
            }
            for s in sessions_raw
        ]

        return {"jobs": jobs, "sessions": sessions}
    except Exception as e:
        print(f"[veeam] fetch error: {e}")
        _token = None
        return {"jobs": [], "sessions": []}


def _map_job_status(result: str) -> str:
    r = (result or "").lower()
    if r in ("success",):       return "ok"
    if r in ("warning",):       return "warn"
    if r in ("failed", "error"):return "crit"
    return "muted"


async def collect_veeam() -> dict:
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_executor, _fetch_sync)
    except Exception as e:
        print(f"[veeam] collect error: {e}")
        return {"jobs": [], "sessions": []}
