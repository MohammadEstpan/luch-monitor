import json
import time
from pathlib import Path
from threading import Lock

_FILE = Path(__file__).parent / "acks.json"
_lock = Lock()
_acks: dict[str, dict] = {}


def _load() -> None:
    global _acks
    if _FILE.exists():
        try:
            _acks = json.loads(_FILE.read_text(encoding="utf-8"))
        except Exception:
            _acks = {}


def _save() -> None:
    _FILE.write_text(json.dumps(_acks, indent=2), encoding="utf-8")


_load()


def ack(alert_id: str, owner: str = "NOC") -> None:
    with _lock:
        _acks[alert_id] = {"owner": owner, "ts": int(time.time()), "kind": "ack"}
        _save()


def mute(alert_id: str, minutes: int = 60, owner: str = "NOC") -> None:
    with _lock:
        _acks[alert_id] = {
            "owner": owner,
            "ts": int(time.time()),
            "kind": "mute",
            "muted_until": int(time.time()) + minutes * 60,
        }
        _save()


def unack(alert_id: str) -> None:
    with _lock:
        _acks.pop(alert_id, None)
        _save()


def get_all() -> dict:
    with _lock:
        now = int(time.time())
        expired = [k for k, v in _acks.items() if v.get("kind") == "mute" and v.get("muted_until", 0) < now]
        for k in expired:
            _acks.pop(k)
        return dict(_acks)
