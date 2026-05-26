import asyncio
import sys

from config import SERVERS


async def collect_servers() -> list[dict]:
    tasks = [_check_server(s) for s in SERVERS]
    return await asyncio.gather(*tasks)


async def _check_server(s: dict) -> dict:
    flag = "-n" if sys.platform == "win32" else "-c"
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", flag, "1", "-w", "1000", s["ip"],
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=4)
        status = "ok" if proc.returncode == 0 else "crit"
    except Exception:
        status = "crit"
    return {**s, "status": status}
