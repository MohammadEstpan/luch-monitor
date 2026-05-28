"""Configurable data retention policies."""
import json
from pathlib import Path
from threading import Lock

_FILE = Path(__file__).parent / "retention.json"
_lock = Lock()

DEFAULTS = {
    "syslog_days":    30,
    "metrics_days":   365,
    "audit_days":     0,      # 0 = keep forever
    "alerts_cache":   500,    # max cached alerts in memory
    "logs_limit":     500,    # default /api/logs limit
    "tasks_archive_solved_days": 90,
}

_cfg: dict = {}


def _load() -> None:
    global _cfg
    if _FILE.exists():
        try:
            _cfg = json.loads(_FILE.read_text(encoding="utf-8"))
        except Exception:
            _cfg = {}
    # fill missing keys with defaults
    for k, v in DEFAULTS.items():
        _cfg.setdefault(k, v)


def _save() -> None:
    _FILE.write_text(json.dumps(_cfg, indent=2), encoding="utf-8")


_load()


def get_all() -> dict:
    with _lock:
        return dict(_cfg)


def update(new_cfg: dict) -> dict:
    with _lock:
        for k in DEFAULTS:
            if k in new_cfg:
                _cfg[k] = new_cfg[k]
        _save()
        return dict(_cfg)


def get(key: str, default=None):
    with _lock:
        return _cfg.get(key, default if default is not None else DEFAULTS.get(key))
