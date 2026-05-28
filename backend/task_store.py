import json
import time
import uuid
from pathlib import Path
from threading import Lock

_FILE = Path(__file__).parent / "tasks.json"
_lock = Lock()
_tasks: list[dict] = []

VALID_STATES = {"open", "on_hold", "pending", "solved"}
VALID_PRIORITIES = {"high", "medium", "low"}


def _load() -> None:
    global _tasks
    if _FILE.exists():
        try:
            _tasks = json.loads(_FILE.read_text(encoding="utf-8"))
        except Exception:
            _tasks = []


def _save() -> None:
    _FILE.write_text(json.dumps(_tasks, indent=2, ensure_ascii=False), encoding="utf-8")


_load()


def list_tasks() -> list[dict]:
    with _lock:
        return list(_tasks)


def create_task(title: str, description: str = "", state: str = "open", priority: str = "medium", tags: list[str] | None = None) -> dict:
    with _lock:
        task = {
            "id": str(uuid.uuid4())[:8],
            "title": title,
            "description": description,
            "state": state if state in VALID_STATES else "open",
            "priority": priority if priority in VALID_PRIORITIES else "medium",
            "tags": tags or [],
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
        }
        _tasks.append(task)
        _save()
        return dict(task)


def update_task(task_id: str, **kwargs) -> dict | None:
    with _lock:
        for t in _tasks:
            if t["id"] == task_id:
                allowed = {"title", "description", "state", "priority", "tags"}
                for k, v in kwargs.items():
                    if k in allowed:
                        t[k] = v
                t["updated_at"] = int(time.time())
                _save()
                return dict(t)
        return None


def delete_task(task_id: str) -> bool:
    with _lock:
        before = len(_tasks)
        _tasks[:] = [t for t in _tasks if t["id"] != task_id]
        if len(_tasks) < before:
            _save()
            return True
        return False
