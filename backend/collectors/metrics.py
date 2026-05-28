import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

import librouteros

from config import HQ_API

_executor = ThreadPoolExecutor(max_workers=2)
_last: dict[str, tuple[int, int, float]] = {}   # name → (rx_bytes, tx_bytes, ts)

_TYPE_CATEGORY = {
    "wireguard":   "wg",
    "ovpn-client": "ovpn",
    "l2tp-client": "l2tp",
    "ether":       "eth",
    "bridge":      "bridge",
    "vlan":        "vlan",
    "ppp-client":  "ppp",
}


def _fmt_bps(bps: int) -> str:
    if bps < 1_000:
        return f"{bps} B/s"
    if bps < 1_000_000:
        return f"{bps/1_000:.1f} KB/s"
    return f"{bps/1_000_000:.2f} MB/s"


def _fetch_sync() -> dict:
    ifaces: list[dict] = []
    try:
        api = librouteros.connect(
            host=HQ_API["host"], username=HQ_API["user"],
            password=HQ_API["password"], port=HQ_API["port"],
        )
        now = time.time()
        for iface in api("/interface/print"):
            name = iface.get("name", "")
            if not name:
                continue
            itype = iface.get("type", "")
            running = str(iface.get("running", "false")).lower() == "true"
            rx = int(iface.get("rx-byte", 0) or 0)
            tx = int(iface.get("tx-byte", 0) or 0)

            rx_bps = tx_bps = 0
            if name in _last:
                old_rx, old_tx, old_ts = _last[name]
                dt = now - old_ts
                if dt > 0 and rx >= old_rx and tx >= old_tx:
                    rx_bps = int((rx - old_rx) / dt)
                    tx_bps = int((tx - old_tx) / dt)
            _last[name] = (rx, tx, now)

            cat = _TYPE_CATEGORY.get(itype, "other")
            ifaces.append({
                "name": name,
                "type": itype,
                "category": cat,
                "running": running,
                "rx_bytes": rx,
                "tx_bytes": tx,
                "rx_bps": rx_bps,
                "tx_bps": tx_bps,
                "rx_fmt": _fmt_bps(rx_bps),
                "tx_fmt": _fmt_bps(tx_bps),
            })
        api.close()
    except Exception as e:
        print(f"[metrics] error: {e}")

    # Aggregate by category for dashboard summary
    totals: dict[str, dict] = {}
    for iface in ifaces:
        cat = iface["category"]
        if cat not in totals:
            totals[cat] = {"rx_bps": 0, "tx_bps": 0, "count": 0, "up": 0}
        totals[cat]["rx_bps"] += iface["rx_bps"]
        totals[cat]["tx_bps"] += iface["tx_bps"]
        totals[cat]["count"] += 1
        if iface["running"]:
            totals[cat]["up"] += 1

    return {
        "interfaces": ifaces,
        "totals": {k: {**v, "rx_fmt": _fmt_bps(v["rx_bps"]), "tx_fmt": _fmt_bps(v["tx_bps"])} for k, v in totals.items()},
    }


async def collect_metrics() -> dict:
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_executor, _fetch_sync)
    except Exception as e:
        print(f"[metrics] collect error: {e}")
        return {"interfaces": [], "totals": {}}
