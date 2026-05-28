"""Asyncio UDP/TCP syslog server — RFC 3164 & 5424 parser."""
import asyncio
import re
import time
from collections import deque

SYSLOG_UDP_PORT = 514
SYSLOG_ALT_PORT = 5140   # fallback if 514 is blocked (no admin rights)
MAX_EVENTS = 10_000

_events: deque = deque(maxlen=MAX_EVENTS)
_transport = None

FACILITY_NAMES = ["kern","user","mail","daemon","auth","syslog","lpr","news",
                  "uucp","cron","security","ftp","ntp","logaudit","logalert",
                  "clock","local0","local1","local2","local3","local4","local5","local6","local7"]
SEVERITY_NAMES = ["emerg","alert","crit","err","warn","notice","info","debug"]


def _parse(raw: str, src_ip: str) -> dict:
    raw = raw.strip()
    # RFC 3164: <PRI>TIMESTAMP HOSTNAME CONTENT
    m3164 = re.match(r"^<(\d{1,3})>(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(.+)$", raw)
    # RFC 5424: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID
    m5424 = re.match(r"^<(\d{1,3})>1\s+(\S+)\s+(\S+)\s+(\S+)\s+\S+\s+\S+\s+(.+)$", raw)

    pri = 0
    hostname = src_ip
    message = raw[:500]

    if m5424:
        pri = int(m5424.group(1))
        hostname = m5424.group(3)
        message = m5424.group(5)[:500]
    elif m3164:
        pri = int(m3164.group(1))
        hostname = m3164.group(3)
        message = m3164.group(4)[:500]

    facility = pri >> 3
    severity = pri & 7
    return {
        "ts": int(time.time()),
        "src": src_ip,
        "hostname": hostname,
        "facility": FACILITY_NAMES[facility] if facility < len(FACILITY_NAMES) else str(facility),
        "severity": SEVERITY_NAMES[severity] if severity < len(SEVERITY_NAMES) else str(severity),
        "sev": "crit" if severity <= 2 else "warn" if severity <= 4 else "info",
        "msg": message,
    }


class _SyslogUDP(asyncio.DatagramProtocol):
    def datagram_received(self, data: bytes, addr) -> None:
        try:
            _events.appendleft(_parse(data.decode("utf-8", errors="replace"), addr[0]))
        except Exception:
            pass

    def error_received(self, exc) -> None:
        print(f"[syslog] UDP error: {exc}")


async def start(port: int | None = None) -> bool:
    global _transport
    loop = asyncio.get_event_loop()

    for try_port in ([port] if port else [SYSLOG_UDP_PORT, SYSLOG_ALT_PORT]):
        try:
            transport, _ = await loop.create_datagram_endpoint(
                _SyslogUDP, local_addr=("0.0.0.0", try_port)
            )
            _transport = transport
            print(f"[syslog] UDP listener on :{try_port}")
            return True
        except PermissionError:
            print(f"[syslog] port {try_port} denied (need admin) — trying next")
        except Exception as e:
            print(f"[syslog] port {try_port} failed: {e}")
    print("[syslog] could not bind any port — syslog disabled")
    return False


def get_events(limit: int = 500, facility: str | None = None) -> list:
    evts = list(_events)
    if facility:
        evts = [e for e in evts if e.get("facility") == facility]
    return evts[:limit]


def purge_older_than_days(days: int) -> int:
    global _events
    if days <= 0:
        return 0
    cutoff = time.time() - days * 86400
    original = len(_events)
    _events = deque((e for e in _events if e.get("ts", 0) >= cutoff), maxlen=MAX_EVENTS)
    return original - len(_events)
