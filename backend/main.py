import asyncio
import json
from pathlib import Path

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from state import AppState
from collectors.branches import collect_branches
from collectors.wazuh import collect_wazuh
from collectors.unifi import collect_unifi
from collectors.servers import collect_servers
from collectors.nvr import collect_nvrs

app = FastAPI(title="Luch Monitor")
state = AppState()
clients: set[WebSocket] = set()

COLLECT_INTERVAL = 30  # seconds between full collections
FRONTEND = Path(__file__).parent.parent / "frontend"


@app.on_event("startup")
async def startup():
    asyncio.create_task(collection_loop())


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
        return_exceptions=True,
    )
    branches, wazuh, unifi, servers, nvrs = results
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


app.mount("/", StaticFiles(directory=str(FRONTEND), html=True), name="static")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
