import asyncio
import json
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from state import AppState
from collectors.branches import collect_branches
from collectors.wazuh import collect_wazuh, fetch_logs
from collectors.unifi import collect_unifi
from collectors.servers import collect_servers
from collectors.nvr import collect_nvrs
import ack_store
import task_store
import integrations_store
import audit_log
import syslog_server
import retention_store
from auth import create_token, require_admin, require_superadmin, optional_user
from ldap_auth import ldap_auth
from collectors.metrics import collect_metrics
from collectors.vmware import collect_vmware
from collectors.veeam import collect_veeam
from shell_proxy import branch_shell_proxy
from config import USERS
from version import VERSION, BUILD

app = FastAPI(title="Luch Monitor")
state = AppState()
clients: set[WebSocket] = set()

COLLECT_INTERVAL = 30  # seconds between full collections
FRONTEND = Path(__file__).parent.parent / "frontend"


@app.on_event("startup")
async def startup():
    asyncio.create_task(collection_loop())
    asyncio.create_task(syslog_server.start())
    asyncio.create_task(purge_loop())


async def purge_loop():
    await asyncio.sleep(3600)  # wait 1 h after startup before first run
    while True:
        try:
            cfg = retention_store.get_all()
            syslog_days = cfg.get("syslog_days", 30)
            audit_days  = cfg.get("audit_days", 0)
            n_syslog = syslog_server.purge_older_than_days(syslog_days)
            n_audit  = audit_log.purge_older_than(audit_days) if audit_days > 0 else 0
            if n_syslog or n_audit:
                print(f"[purge] removed syslog={n_syslog} audit={n_audit}")
        except Exception as e:
            print(f"[purge] error: {e}")
        await asyncio.sleep(86400)


async def broadcast(data: dict):
    dead = set()
    payload = json.dumps(data, ensure_ascii=False, default=str)
    for ws in list(clients):
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    clients.difference_update(dead)


async def run_collection():
    results = await asyncio.gather(
        collect_branches(),
        collect_wazuh(),
        collect_unifi(),
        collect_servers(),
        collect_nvrs(),
        collect_metrics(),
        return_exceptions=True,
    )
    branches, wazuh, unifi, servers, nvrs, metrics = results
    update = {}
    if not isinstance(branches, Exception):
        update["branches"] = branches
        state.clear_error("branches")
    else:
        state.set_error("branches", str(branches))

    if not isinstance(wazuh, Exception):
        update["wazuh"] = wazuh
        state.clear_error("wazuh")
    else:
        state.set_error("wazuh", str(wazuh))

    if not isinstance(unifi, Exception):
        update["unifi"] = unifi
        state.clear_error("unifi")
    else:
        state.set_error("unifi", str(unifi))

    if not isinstance(servers, Exception):
        update["servers"] = servers
        state.clear_error("servers")
    else:
        state.set_error("servers", str(servers))

    if not isinstance(nvrs, Exception):
        update["nvrs"] = nvrs
        state.clear_error("nvrs")
    else:
        state.set_error("nvrs", str(nvrs))

    if not isinstance(metrics, Exception):
        update["metrics"] = metrics
        state.clear_error("metrics")
    else:
        state.set_error("metrics", str(metrics))

    vmware, veeam = await asyncio.gather(collect_vmware(), collect_veeam(), return_exceptions=True)
    if not isinstance(vmware, Exception):
        update["vmware_vms"] = vmware
    if not isinstance(veeam, Exception):
        update["veeam"] = veeam

    state.update(**update)


async def collection_loop():
    while True:
        try:
            await run_collection()
            await broadcast(state.to_dict())
        except Exception as e:
            print(f"[main] collection_loop error: {e}")
        await asyncio.sleep(COLLECT_INTERVAL)


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    await ws.send_text(json.dumps(state.to_dict(), ensure_ascii=False, default=str))
    try:
        while True:
            await asyncio.wait_for(ws.receive_text(), timeout=60)
    except (WebSocketDisconnect, asyncio.TimeoutError, Exception):
        pass
    finally:
        clients.discard(ws)


@app.get("/api/state")
async def get_state():
    return JSONResponse(state.to_dict())


@app.get("/api/refresh")
async def trigger_refresh():
    asyncio.create_task(_refresh_and_broadcast())
    return {"status": "collecting"}


async def _refresh_and_broadcast():
    await run_collection()
    await broadcast(state.to_dict())


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else ""
    user = USERS.get(req.username)
    if not user:
        audit_log.log("anonymous", "login_fail", f"user/{req.username}", "unknown user", ip=client_ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    loop = asyncio.get_event_loop()
    ad_ok = await loop.run_in_executor(None, ldap_auth, req.username, req.password)
    local_ok = (not ad_ok) and (user.get("password") == req.password)

    if not ad_ok and not local_ok:
        audit_log.log(req.username, "login_fail", f"user/{req.username}", "bad password", ip=client_ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(req.username, user["role"])
    method = "AD" if ad_ok else "local-fallback"
    audit_log.log(req.username, "login", f"user/{req.username}", method, ip=client_ip)
    return {
        "username": req.username,
        "name": user["name"],
        "role": user["role"],
        "initials": user["initials"],
        "email": user["email"],
        "token": token,
        "auth_method": method,
    }


@app.get("/api/version")
async def get_version():
    return {"version": VERSION, "build": BUILD}


# ── Alerts: ACK / mute ────────────────────────────────────────────────────────

class AckRequest(BaseModel):
    owner: str = "NOC"


@app.post("/api/alerts/{alert_id}/ack")
async def ack_alert(alert_id: str, req: AckRequest = AckRequest()):
    ack_store.ack(alert_id, req.owner)
    state.acks = ack_store.get_all()
    asyncio.create_task(broadcast(state.to_dict()))
    return {"status": "ok"}


@app.post("/api/alerts/{alert_id}/unack")
async def unack_alert(alert_id: str):
    ack_store.unack(alert_id)
    state.acks = ack_store.get_all()
    asyncio.create_task(broadcast(state.to_dict()))
    return {"status": "ok"}


@app.post("/api/alerts/{alert_id}/mute")
async def mute_alert(alert_id: str, minutes: int = 60, owner: str = "NOC"):
    ack_store.mute(alert_id, minutes, owner)
    state.acks = ack_store.get_all()
    asyncio.create_task(broadcast(state.to_dict()))
    return {"status": "ok", "muted_minutes": minutes}


# ── Logs ──────────────────────────────────────────────────────────────────────

@app.get("/api/logs")
async def get_logs(limit: int = 200, level: str = "all", q: str = ""):
    loop = asyncio.get_event_loop()
    try:
        logs = await loop.run_in_executor(None, lambda: fetch_logs(limit=limit))
        if level != "all":
            logs = [l for l in logs if l.get("sev") == level]
        if q:
            ql = q.lower()
            logs = [l for l in logs if ql in (l.get("rule") or "").lower() or ql in (l.get("agent") or "").lower()]
        return logs
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Tasks (superadmin only — server-side enforcement in Phase 3 / ADFS) ──────

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    state: str = "open"
    priority: str = "medium"
    tags: list[str] = []


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    state: str | None = None
    priority: str | None = None
    tags: list[str] | None = None


@app.get("/api/tasks")
async def list_tasks():
    return task_store.list_tasks()


@app.post("/api/tasks")
async def create_task(req: TaskCreate):
    return task_store.create_task(req.title, req.description, req.state, req.priority, req.tags)


@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, req: TaskUpdate):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    result = task_store.update_task(task_id, **updates)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    if not task_store.delete_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}


# ── Shell terminal (WebSocket SSH proxy) ──────────────────────────────────────

@app.websocket("/ws/shell/{branch_id}")
async def ws_shell(ws: WebSocket, branch_id: int):
    await ws.accept()
    await branch_shell_proxy(ws, branch_id)


# ── Integrations (Telegram / Slack / Teams) ───────────────────────────────────

class IntegrationConfig(BaseModel):
    enabled: bool = False
    bot_token: str = ""      # Telegram
    chat_id: str = ""        # Telegram
    webhook_url: str = ""    # Slack / Teams


@app.get("/api/integrations")
async def get_integrations():
    return integrations_store.get_all()


@app.put("/api/integrations/{platform}")
async def save_integration(platform: str, cfg: IntegrationConfig):
    integrations_store.update(platform, cfg.model_dump())
    return {"status": "saved"}


@app.post("/api/integrations/{platform}/test")
async def test_integration(platform: str):
    loop = asyncio.get_event_loop()
    ok, msg = await loop.run_in_executor(None, integrations_store.test_webhook, platform)
    return {"ok": ok, "message": msg}


# ── Metrics ───────────────────────────────────────────────────────────────────

@app.get("/api/metrics")
async def get_metrics():
    return state.metrics


# ── Audit log ────────────────────────────────────────────────────────────────

@app.get("/api/audit")
async def get_audit(limit: int = 200, user: dict = require_admin):
    return audit_log.get_entries(limit=limit)


# ── Syslog ────────────────────────────────────────────────────────────────────

@app.get("/api/syslog")
async def get_syslog(limit: int = 500, facility: str | None = None):
    return syslog_server.get_events(limit=limit, facility=facility)


# ── Retention ────────────────────────────────────────────────────────────────

@app.get("/api/retention")
async def get_retention():
    return retention_store.get_all()


class RetentionConfig(BaseModel):
    syslog_days: int | None = None
    metrics_days: int | None = None
    audit_days: int | None = None
    alerts_cache: int | None = None
    logs_limit: int | None = None
    tasks_archive_solved_days: int | None = None


@app.put("/api/retention")
async def save_retention(cfg: RetentionConfig, user: dict = require_admin):
    updates = {k: v for k, v in cfg.model_dump().items() if v is not None}
    audit_log.log(user["username"], "update", "retention", str(updates))
    return retention_store.update(updates)


# ── VMware / Veeam inventory ─────────────────────────────────────────────────

@app.get("/api/vmware/vms")
async def get_vms():
    return state.vmware_vms if hasattr(state, "vmware_vms") else []


@app.get("/api/veeam/jobs")
async def get_veeam_jobs():
    return state.veeam.get("jobs", []) if hasattr(state, "veeam") else []


@app.get("/api/veeam/sessions")
async def get_veeam_sessions():
    return state.veeam.get("sessions", []) if hasattr(state, "veeam") else []


app.mount("/", StaticFiles(directory=str(FRONTEND), html=True), name="static")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
