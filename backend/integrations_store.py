import json
import requests
from pathlib import Path
from threading import Lock

_FILE = Path(__file__).parent / "integrations.json"
_lock = Lock()
_cfg: dict = {}


def _load():
    global _cfg
    if _FILE.exists():
        try:
            _cfg = json.loads(_FILE.read_text(encoding="utf-8"))
        except Exception:
            _cfg = {}


def _save():
    _FILE.write_text(json.dumps(_cfg, indent=2, ensure_ascii=False), encoding="utf-8")


_load()


def get_all() -> dict:
    with _lock:
        return dict(_cfg)


def update(platform: str, data: dict) -> None:
    with _lock:
        _cfg[platform] = data
        _save()


def get_platform(platform: str) -> dict:
    with _lock:
        return dict(_cfg.get(platform, {}))


def test_webhook(platform: str) -> tuple[bool, str]:
    cfg = get_platform(platform)
    if not cfg.get("enabled"):
        return False, "Integration not enabled"
    test_text = "✅ TK-Luch Monitor — test notification"
    try:
        if platform == "telegram":
            token = cfg.get("bot_token", "")
            chat_id = cfg.get("chat_id", "")
            if not token or not chat_id:
                return False, "Missing bot_token or chat_id"
            r = requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": test_text}, timeout=8,
            )
            return r.ok, r.text[:200]
        elif platform in ("slack", "teams"):
            url = cfg.get("webhook_url", "")
            if not url:
                return False, "Missing webhook_url"
            payload = {"text": test_text} if platform == "slack" else {"text": test_text}
            r = requests.post(url, json=payload, timeout=8)
            return r.ok, r.text[:200]
        else:
            return False, f"Unknown platform: {platform}"
    except Exception as e:
        return False, str(e)


def send_alert(title: str, body: str, sev: str = "warn") -> None:
    """Send an alert notification to all enabled platforms."""
    icon = "🔴" if sev == "crit" else "🟡" if sev == "warn" else "🔵"
    text = f"{icon} *{title}*\n{body}"
    for platform in ("telegram", "slack", "teams"):
        cfg = get_platform(platform)
        if not cfg.get("enabled"):
            continue
        try:
            if platform == "telegram":
                requests.post(
                    f"https://api.telegram.org/bot{cfg['bot_token']}/sendMessage",
                    json={"chat_id": cfg["chat_id"], "text": text, "parse_mode": "Markdown"},
                    timeout=5,
                )
            elif platform in ("slack", "teams"):
                requests.post(cfg["webhook_url"], json={"text": text}, timeout=5)
        except Exception as e:
            print(f"[integrations] {platform} send error: {e}")
