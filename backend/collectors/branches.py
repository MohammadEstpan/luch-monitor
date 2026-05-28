import asyncio
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import librouteros

from config import HQ_API, BRANCHES

_executor = ThreadPoolExecutor(max_workers=4)


async def collect_branches() -> list[dict]:
    loop = asyncio.get_event_loop()
    hq_data = await loop.run_in_executor(_executor, _fetch_hq_routing)
    branches = _build_branch_list(hq_data)
    ping_tasks = [_ping(b["lo"]) for b in branches]
    pings = await asyncio.gather(*ping_tasks)
    for b, ms in zip(branches, pings):
        b["ping_ms"] = ms
        if b["status"] == "unknown" and ms is not None:
            b["status"] = "ok"
    return branches


def _fetch_hq_routing() -> dict:
    ospf: dict[str, str] = {}
    bgp: dict[str, str] = {}
    interfaces: list[dict] = []
    try:
        api = librouteros.connect(
            host=HQ_API["host"],
            username=HQ_API["user"],
            password=HQ_API["password"],
            port=HQ_API["port"],
        )
        for n in api("/routing/ospf/neighbor/print"):
            ip = n.get("address", "").split("%")[0]
            ospf[ip] = n.get("state", "down").lower()
        for s in api("/routing/bgp/session/print"):
            ip = s.get("remote.address", "").split("%")[0]
            established = str(s.get("established", "false")).lower() == "true"
            bgp[ip] = "up" if established else "down"
        try:
            for iface in api("/interface/print"):
                rx = iface.get("rx-byte", 0)
                tx = iface.get("tx-byte", 0)
                interfaces.append({
                    "name": iface.get("name", ""),
                    "type": iface.get("type", ""),
                    "running": str(iface.get("running", "false")).lower() == "true",
                    "rx_bytes": int(rx) if rx else 0,
                    "tx_bytes": int(tx) if tx else 0,
                })
        except Exception:
            pass
        api.close()
    except Exception as e:
        print(f"[branches] HQ API error: {e}")
    return {"ospf": ospf, "bgp": bgp, "interfaces": interfaces}


def _build_branch_list(hq: dict) -> list[dict]:
    ospf = hq["ospf"]
    bgp = hq["bgp"]
    result = []
    for b in BRANCHES:
        idx = b["id"]
        l2tp_ip  = f"172.27.23.{idx}"
        wg_ip    = f"200.200.100.{idx}"
        ovpn_ip  = f"172.27.25.{idx}"
        lo_ip    = f"10.255.255.{idx}"

        ospf_state = ospf.get(l2tp_ip, "unknown")
        bgp_wg     = bgp.get(wg_ip, "unknown")
        bgp_ovpn   = bgp.get(ovpn_ip, "unknown")

        if ospf_state == "full" or bgp_wg == "up" or bgp_ovpn == "up":
            status = "ok"
        elif ospf_state in ("down",) or bgp_wg == "down" or bgp_ovpn == "down":
            status = "crit"
        else:
            status = "unknown"

        result.append({
            **b,
            "lo": lo_ip,
            "l2tp_ip": l2tp_ip,
            "wg_ip": wg_ip,
            "ovpn_ip": ovpn_ip,
            "l2tp": ospf_state,   # L2TP OSPF neighbor state
            "ospf": ospf_state,   # kept for backwards compat
            "bgp_wg": bgp_wg,
            "bgp_ovpn": bgp_ovpn,
            "status": status,
            "ping_ms": None,
        })
    return result


async def _ping(ip: str) -> int | None:
    flag = "-n" if sys.platform == "win32" else "-c"
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", flag, "1", "-w", "1000", ip,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=3)
        if proc.returncode == 0:
            return 1
    except Exception:
        pass
    return None
