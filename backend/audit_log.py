"""Append-only forensic audit trail — Who / What / When."""
import json
import time
from pathlib import Path

_FILE = Path(__file__).parent / "audit.jsonl"

# Ensure file exists
_FILE.touch(exist_ok=True)


def log(username: str, action: str, resource: str, details: str = "", ip: str = "") -> None:
    entry = {
        "ts": int(time.time()),
        "user": username,
        "action": action,      # create | update | delete | ack | mute | login | logout
        "resource": resource,  # e.g. "task/2574a0d8", "alert/W-12", "integration/telegram"
        "details": details[:500],
        "ip": ip,
    }
    with _FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def get_entries(limit: int = 200, username: str | None = None) -> list:
    if not _FILE.exists() or _FILE.stat().st_size == 0:
        return []
    lines = _FILE.read_text(encoding="utf-8").splitlines()
    result = []
    for line in reversed(lines):
        if not line.strip():
            continue
        try:
            e = json.loads(line)
            if username and e.get("user") != username:
                continue
            result.append(e)
            if len(result) >= limit:
                break
        except Exception:
            pass
    return result


def purge_older_than(days: int) -> int:
    if not _FILE.exists():
        return 0
    cutoff = time.time() - days * 86400
    lines = _FILE.read_text(encoding="utf-8").splitlines()
    kept = []
    removed = 0
    for line in lines:
        try:
            e = json.loads(line)
            if e.get("ts", 0) >= cutoff:
                kept.append(line)
            else:
                removed += 1
        except Exception:
            kept.append(line)
    _FILE.write_text("\n".join(kept) + ("\n" if kept else ""), encoding="utf-8")
    return removed
