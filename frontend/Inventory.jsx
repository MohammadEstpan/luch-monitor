/* TK-Luch · Inventory — live branches + servers + agents */

function Inventory() {
  const t = useT();
  const { data } = useData();
  const branches = data?.branches ?? [];
  const servers  = data?.servers  ?? [];
  const agents   = data?.wazuh?.agents ?? [];
  const nvrs     = data?.nvrs ?? [];
  const unifi    = data?.unifi ?? {};

  const [tab, setTab] = React.useState("branches");
  const [q, setQ] = React.useState("");

  const branchRows = branches
    .filter(b => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.lo.includes(q) || b.city.toLowerCase().includes(q.toLowerCase()))
    .map(b => ({ name: b.name, ip: b.lo, role: "branch-router", city: b.city,
                 ospf: b.ospf, bgp_wg: b.bgp_wg, bgp_ovpn: b.bgp_ovpn,
                 status: b.status === "unknown" ? "muted" : b.status }));

  const serverRows = servers
    .filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.ip.includes(q))
    .map(s => ({ name: s.name, ip: s.ip, role: s.role, city: "HQ", status: s.status, org: s.org }));

  const agentRows = agents
    .filter(a => !q || (a.name || "").toLowerCase().includes(q.toLowerCase()))
    .map(a => ({ name: a.name, ip: a.ip, role: "wazuh-agent", city: a.group || "—",
                 status: a.status === "active" ? "ok" : a.status === "disconnected" ? "crit" : "muted" }));

  const nvrRows = nvrs
    .filter(n => !q || n.name.toLowerCase().includes(q.toLowerCase()))
    .map(n => ({ name: n.name, ip: n.ip, role: "NVR/DVR", city: "—", status: n.status }));

  const tabs = [
    { k: "branches", label: t("Branches", "Филиалы"),   cnt: branches.length },
    { k: "servers",  label: t("Servers",  "Серверы"),   cnt: servers.length },
    { k: "agents",   label: t("Agents",   "Агенты"),    cnt: agents.length },
    { k: "nvr",      label: t("NVR/Cam",  "NVR/Кам."), cnt: nvrs.length },
  ];

  const activeRows = { branches: branchRows, servers: serverRows, agents: agentRows, nvr: nvrRows }[tab] ?? [];

  const bar = pct => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontVariantNumeric: "tabular-nums" }}>
      <div style={{ width: 60, height: 4, background: "var(--ink-200)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: pct >= 85 ? "var(--status-crit)" : pct >= 70 ? "var(--status-warn)" : "var(--status-ok)",
        }}/>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)", width: 30 }}>{pct}%</span>
    </div>
  );

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-section">{t("Inventory", "Учёт")}</div>
          <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Hosts", "Хосты")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button iconLeft="download">{t("Export", "Экспорт")}</Button>
          <Button variant="primary" iconLeft="plus">{t("Add host", "Добавить хост")}</Button>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-2)" }}>
        {tabs.map(tt => (
          <button key={tt.k} onClick={() => setTab(tt.k)} style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px",
            background: "transparent", border: 0, borderBottom: `2px solid ${tab === tt.k ? "var(--accent)" : "transparent"}`,
            color: tab === tt.k ? "var(--fg-1)" : "var(--fg-3)", fontSize: 13, cursor: "pointer",
            marginBottom: -1,
          }}>
            {tt.label}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 3, padding: "1px 5px" }}>{tt.cnt}</span>
          </button>
        ))}
      </div>

      {/* filters */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Filter by hostname or IP…", "Фильтр по имени или IP…")} iconLeft="search" style={{ width: 280 }}/>
        <Chip active>env: prod</Chip>
        <Chip>depot: {t("all", "все")}</Chip>
        <Chip>role: {t("all", "все")}</Chip>
        <Chip>status: {t("all", "все")}</Chip>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          {t("Showing", "Показано")} <span style={{ color: "var(--fg-1)" }}>{activeRows.length}</span>
        </div>
      </div>

      <Table
        getRowKey={r => r.name + r.ip}
        columns={[
          { header: "", width: 36, cell: r => <StatusDot status={r.status} live={r.status === "crit"}/> },
          { header: t("Name", "Имя"),  mono: true, cell: r => r.name },
          { header: "IP",              mono: true, width: 130, cell: r => r.ip },
          { header: t("Role", "Роль"), width: 140, cell: r => <span style={{ color: "var(--fg-2)" }}>{r.role}</span> },
          { header: t("City", "Город"),width: 140, cell: r => <span style={{ color: "var(--fg-2)" }}>{r.city}</span> },
          { header: "Status", width: 100, cell: r => <Badge status={r.status}>{r.status}</Badge> },
        ]}
        rows={activeRows}
      />
    </div>
  );
}

Object.assign(window, { Inventory });
