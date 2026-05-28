/* TK-Luch · Dashboard screen — live data */

function Dashboard() {
  const t = useT();
  const { data, refresh } = useData();
  const sum = data?.summary ?? {};
  const branches = data?.branches ?? [];
  const servers  = data?.servers  ?? [];
  const wazuh    = data?.wazuh    ?? {};
  const unifi    = data?.unifi    ?? {};

  const metrics   = data?.metrics ?? {};
  const totals    = metrics.totals ?? {};
  const branchesUp   = sum.branches_up   ?? 0;
  const branchesTotal = sum.branches_total ?? 0;
  const branchesCrit  = sum.branches_crit  ?? 0;
  const alertsCrit   = sum.alerts_crit   ?? 0;
  const alertsWarn   = sum.alerts_warn   ?? 0;
  const agentsUp     = sum.wazuh_agents_up    ?? 0;
  const agentsTotal  = sum.wazuh_agents_total ?? 0;
  const apsUp        = sum.aps_up    ?? 0;
  const apsTotal     = sum.aps_total ?? 0;

  const citySummary = React.useMemo(() => {
    const map = {};
    for (const b of branches) {
      const city = b.city || "—";
      if (!map[city]) map[city] = { city, total: 0, up: 0, crit: 0 };
      map[city].total++;
      if (b.status === "ok") map[city].up++;
      if (b.status === "crit") map[city].crit++;
    }
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(c => ({
        ...c,
        status: c.crit > 0 ? "crit" : c.up < c.total ? "warn" : "ok",
      }));
  }, [branches]);

  const recentAlerts = (wazuh.recent_alerts ?? []).slice(0, 5);

  const serversDisplay = servers.map(s => ({
    name: s.name,
    state: s.status === "ok" ? "ok" : "crit",
    role: s.role,
  }));

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-section">{t("Observability", "Наблюдаемость")}</div>
          <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Overview", "Обзор")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <WsStatusBadge/>
          <Button iconLeft="refresh" onClick={refresh}>{t("Refresh", "Обновить")}</Button>
        </div>
      </div>

      {/* Metric row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <MetricCard
          label={t("Branches UP", "Филиалы онлайн")}
          value={String(branchesUp)}
          unit={`/ ${branchesTotal}`}
          delta={branchesCrit > 0 ? `${branchesCrit} ↓ crit` : t("All OK", "Все OK")}
          deltaTone={branchesCrit > 0 ? "crit" : "ok"}
          sparkColor="#10B981"
          sparkPoints="0,30 20,28 40,26 60,24 80,20 100,18 120,14 140,12 160,10 180,8 200,6"
        />
        <MetricCard
          label={t("Wazuh Agents", "Агенты Wazuh")}
          value={String(agentsUp)}
          unit={`/ ${agentsTotal}`}
          delta={agentsTotal > 0 ? `${Math.round(agentsUp/agentsTotal*100)}%` : "—"}
          deltaTone={agentsUp < agentsTotal ? "warn" : "ok"}
          sparkColor="#3B82F6"
          sparkPoints="0,20 20,18 40,16 60,18 80,14 100,12 120,10 140,12 160,8 180,6 200,4"
        />
        <MetricCard
          label={t("Active Alerts", "Активные алерты")}
          value={String(alertsCrit + alertsWarn)}
          delta={alertsCrit > 0 ? `${alertsCrit} P1` : alertsWarn > 0 ? `${alertsWarn} P2` : t("None", "Нет")}
          deltaTone={alertsCrit > 0 ? "crit" : alertsWarn > 0 ? "warn" : "ok"}
          sparkColor="#FF3B30"
          sparkPoints="0,30 20,30 40,28 60,28 80,26 100,24 120,22 140,18 160,12 180,8 200,4"
        />
        <MetricCard
          label={t("WiFi APs UP", "AP WiFi онлайн")}
          value={String(apsUp)}
          unit={`/ ${apsTotal}`}
          delta={`${sum.wifi_clients ?? 0} clients`}
          deltaTone={apsUp < apsTotal ? "warn" : "ok"}
          sparkColor="#F59E0B"
          sparkPoints="0,8 20,10 40,8 60,12 80,8 100,10 120,6 140,8 160,6 180,8 200,4"
        />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        {/* Branches by city */}
        <Card section={t("Branches", "Филиалы")} title={t("Status by city", "По городам")}
              action={<Button size="sm" variant="ghost" iconRight="chevronRight">{t("All branches", "Все")}</Button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {citySummary.length === 0
              ? <div style={{ color: "var(--fg-3)", fontSize: 12, padding: 8 }}>{t("Loading…", "Загрузка…")}</div>
              : citySummary.map(c => (
                  <div key={c.city} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", borderBottom: "1px solid var(--border-1)" }}>
                    <StatusDot status={c.status} live={c.status === "crit"} size={8}/>
                    <span style={{ fontSize: 13, color: "var(--fg-1)", flex: 1 }}>{c.city}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>
                      <span style={{ color: c.crit > 0 ? "var(--status-crit)" : c.up < c.total ? "var(--status-warn)" : "var(--status-ok)" }}>{c.up}</span>
                      <span style={{ color: "var(--fg-3)" }}> / {c.total}</span>
                    </span>
                  </div>
                ))}
          </div>
        </Card>

        {/* Recent Alerts */}
        <Card section={t("Alerts", "Алерты")} title={t("Recent · Wazuh", "Недавние · Wazuh")}
              action={<Button size="sm" variant="ghost" iconRight="chevronRight">{t("All", "Все")}</Button>}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentAlerts.length === 0
              ? <div style={{ color: "var(--fg-3)", fontSize: 12, padding: 8 }}>{t("No alerts", "Нет алертов")}</div>
              : recentAlerts.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 4px", borderBottom: "1px solid var(--border-1)" }}>
                    <StatusDot status={a.sev} live={a.sev === "crit"} size={7} style={{ marginTop: 3 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.rule}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>{a.agent} · {a.group}</div>
                    </div>
                    <Badge status={a.sev}>{a.sev === "crit" ? "P1" : a.sev === "warn" ? "P2" : "—"}</Badge>
                  </div>
                ))}
          </div>
        </Card>
      </div>

      {/* Bandwidth strip */}
      {Object.keys(totals).length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "wg",   label: "WireGuard", color: "#10B981" },
            { key: "ovpn", label: "OpenVPN",   color: "#22D3EE" },
            { key: "l2tp", label: "L2TP",      color: "#F59E0B" },
            { key: "eth",  label: "Uplink",    color: "#3B82F6" },
          ].filter(s => totals[s.key]).map(s => {
            const d = totals[s.key];
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "6px 14px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }}/>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{s.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>
                  <span style={{ color: "#10B981" }}>↓</span> {d.rx_fmt}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>
                  <span style={{ color: "#F59E0B" }}>↑</span> {d.tx_fmt}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>{d.up}/{d.count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Lower grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        {/* Branch status table */}
        <Card section={t("Network", "Сеть")} title={t("Branch tunnel health", "Туннели филиалов")}>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                  <th style={{ textAlign: "left", padding: "4px 6px", fontWeight: 400 }}>{t("Branch", "Филиал")}</th>
                  <th style={{ textAlign: "center", padding: "4px 6px", fontWeight: 400 }}>L2TP</th>
                  <th style={{ textAlign: "center", padding: "4px 6px", fontWeight: 400 }}>WG</th>
                  <th style={{ textAlign: "center", padding: "4px 6px", fontWeight: 400 }}>OVPN</th>
                  <th style={{ textAlign: "right",  padding: "4px 6px", fontWeight: 400 }}>Ping</th>
                </tr>
              </thead>
              <tbody>
                {branches.filter(b => b.status !== "ok").concat(branches.filter(b => b.status === "ok")).slice(0, 20).map(b => (
                  <tr key={b.id} style={{ borderTop: "1px solid var(--border-1)" }}>
                    <td style={{ padding: "5px 6px", display: "flex", alignItems: "center", gap: 6 }}>
                      <StatusDot status={b.status === "unknown" ? "info" : b.status} size={6}/>
                      <span style={{ color: "var(--fg-1)" }}>{b.name}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "5px 6px", fontFamily: "var(--font-mono)", fontSize: 10, color: b.ospf === "full" ? "var(--status-ok)" : b.ospf === "unknown" ? "var(--fg-3)" : "var(--status-crit)" }}>
                      {b.ospf === "full" ? "●" : b.ospf === "unknown" ? "–" : "○"}
                    </td>
                    <td style={{ textAlign: "center", padding: "5px 6px", fontFamily: "var(--font-mono)", fontSize: 10, color: b.bgp_wg === "up" ? "var(--status-ok)" : b.bgp_wg === "unknown" ? "var(--fg-3)" : "var(--status-crit)" }}>
                      {b.bgp_wg === "up" ? "●" : b.bgp_wg === "unknown" ? "–" : "○"}
                    </td>
                    <td style={{ textAlign: "center", padding: "5px 6px", fontFamily: "var(--font-mono)", fontSize: 10, color: b.bgp_ovpn === "up" ? "var(--status-ok)" : b.bgp_ovpn === "unknown" ? "var(--fg-3)" : "var(--status-crit)" }}>
                      {b.bgp_ovpn === "up" ? "●" : b.bgp_ovpn === "unknown" ? "–" : "○"}
                    </td>
                    <td style={{ textAlign: "right", padding: "5px 6px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>
                      {b.ping_ms != null ? `${b.ping_ms}ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Servers */}
        <Card section={t("Servers", "Серверы")} title={t("HQ infrastructure", "HQ инфраструктура")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {serversDisplay.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusDot status={s.state} size={7}/>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-1)", flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{s.role}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
