import time
from typing import Any


class AppState:
    def __init__(self):
        self.branches: list[dict] = []
        self.wazuh: dict = {}
        self.unifi: dict = {}
        self.servers: list[dict] = []
        self.nvrs: list[dict] = []
        self.last_update: float = 0
        self.collector_errors: dict[str, str] = {}

    def update(self, **kwargs):
        for k, v in kwargs.items():
            if hasattr(self, k):
                setattr(self, k, v)
        self.last_update = time.time()

    def set_error(self, collector: str, msg: str):
        self.collector_errors[collector] = msg

    def clear_error(self, collector: str):
        self.collector_errors.pop(collector, None)

    def to_dict(self) -> dict:
        branches_up = sum(1 for b in self.branches if b.get("status") == "ok")
        branches_warn = sum(1 for b in self.branches if b.get("status") == "warn")
        branches_crit = sum(1 for b in self.branches if b.get("status") == "crit")
        servers_up = sum(1 for s in self.servers if s.get("status") == "ok")

        return {
            "type": "full",
            "ts": int(self.last_update),
            "branches": self.branches,
            "wazuh": self.wazuh,
            "unifi": self.unifi,
            "servers": self.servers,
            "nvrs": self.nvrs,
            "errors": self.collector_errors,
            "summary": {
                "branches_total": len(self.branches),
                "branches_up": branches_up,
                "branches_warn": branches_warn,
                "branches_crit": branches_crit,
                "servers_total": len(self.servers),
                "servers_up": servers_up,
                "alerts_crit": self.wazuh.get("alerts_crit", 0),
                "alerts_warn": self.wazuh.get("alerts_warn", 0),
                "wazuh_agents_up": self.wazuh.get("agents_active", 0),
                "wazuh_agents_total": self.wazuh.get("agents_total", 0),
                "aps_up": self.unifi.get("aps_up", 0),
                "aps_total": self.unifi.get("aps_total", 0),
                "wifi_clients": self.unifi.get("clients", 0),
            },
        }
