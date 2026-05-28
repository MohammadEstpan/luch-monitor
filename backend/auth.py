"""HMAC-based stateless tokens — replaced by ADFS in Phase 3b."""
import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, Header, HTTPException

SECRET = os.environ.get("LUCH_SECRET", "luch-monitor-hmac-2026-changeme")
TOKEN_TTL = 86400  # 24 hours

ROLE_LEVEL = {"viewer": 0, "admin": 1, "superadmin": 2}


def create_token(username: str, role: str) -> str:
    payload = json.dumps({"u": username, "r": role, "iat": int(time.time())}, separators=(",", ":"))
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    raw = json.dumps({"p": payload, "s": sig}, separators=(",", ":"))
    return base64.urlsafe_b64encode(raw.encode()).decode()


def verify_token(token: str) -> dict | None:
    try:
        raw = json.loads(base64.urlsafe_b64decode(token.encode() + b"==").decode())
        payload_str = raw["p"]
        sig = raw["s"]
        expected = hmac.new(SECRET.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        p = json.loads(payload_str)
        if time.time() - p["iat"] > TOKEN_TTL:
            return None
        return {"username": p["u"], "role": p["r"]}
    except Exception:
        return None


# ── FastAPI dependencies ──────────────────────────────────────────────────────

def _extract_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return authorization[7:]


def get_current_user(token: str = Depends(_extract_token)) -> dict:
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if ROLE_LEVEL.get(user["role"], 0) < ROLE_LEVEL["admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_superadmin(user: dict = Depends(get_current_user)) -> dict:
    if ROLE_LEVEL.get(user["role"], 0) < ROLE_LEVEL["superadmin"]:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user


def optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    """Returns user dict or None — does NOT raise for unauthenticated requests."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return verify_token(authorization[7:])
