/* TK-Luch · Inventory — 11 sub-tabs per PRD */

/* ─── SSH Terminal Modal ──────────────────────────────────────────────────── */
function TerminalModal({ branch, onClose }) {
  const containerRef = React.useRef(null);
  const termRef = React.useRef(null);
  const wsRef = React.useRef(null);
  const [status, setStatus] = React.useState("connecting");

  React.useEffect(() => {
    if (!containerRef.current || !window.Terminal) return;

    const term = new window.Terminal({
      theme: { background: "#0a0f1a", foreground: "#c8d3f5", cursor: "#ff3b30", selectionBackground: "#ffffff22" },
      fontFamily: '"IBM Plex Mono", "Cascadia Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 2000,
    });
    term.open(containerRef.current);
    termRef.current = term;

    const wsUrl = `ws://${location.host}/ws/shell/${branch.id}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => { setStatus("open"); };
    ws.onmessage = (e) => {
      const data = e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : e.data;
      term.write(data);
    };
    ws.onclose = () => { setStatus("closed"); term.write("\r\n\x1b[33m[Disconnected]\x1b[0m\r\n"); };
    ws.onerror = () => { setStatus("error"); };

    term.onData(data => {
      if (ws.readyState === WebSocket.OPEN) ws.send(new TextEncoder().encode(data));
    });

    return () => {
      ws.close();
      term.dispose();
    };
  }, [branch.id]);

  const statusColor = { connecting: "var(--status-warn)", open: "var(--status-ok)", closed: "var(--fg-3)", error: "var(--status-crit)" };
  const statusLabel = { connecting: "Connecting…", open: "Connected", closed: "Disconnected", error: "Error" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0d1117", border: "1px solid var(--border-2)", borderRadius: 8, overflow: "hidden", width: "min(960px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        {/* Terminal chrome */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "var(--bg-chrome)", borderBottom: "1px solid var(--border-2)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57", cursor: "pointer" }} onClick={onClose}/>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }}/>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }}/>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-2)" }}>
            SSH · {branch.name} · 10.255.255.{branch.id}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: statusColor[status] }}>● {statusLabel[status]}</span>
          <div style={{ flex: 1 }}/>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "var(--fg-3)", cursor: "pointer" }}>
            <Icon name="x" size={16}/>
          </button>
        </div>
        {/* xterm container */}
        <div ref={containerRef} style={{ flex: 1, minHeight: 400, padding: "4px 4px 0" }}/>
      </div>
    </div>
  );
}

function Inventory() {
  const t = useT();
  const { data } = useData();
  const [sshTarget, setSshTarget] = React.useState(null);
  const branches = data?.branches ?? [];
  const servers  = data?.servers  ?? [];
  const agents   = data?.wazuh?.agents ?? [];
  const nvrs     = data?.nvrs ?? [];
  const unifi    = data?.unifi ?? {};
  const apList   = unifi.ap_list ?? [];

  const [tab, setTab] = React.useState("routers");
  const [q, setQ] = React.useState("");

  /* Derived rows per tab */
  const routers = branches.map(b => ({
    name: b.name, ip: b.lo, role: "MikroTik Router", city: b.city || "—",
    org: b.country === "KZ" ? "otr-it" : "luch",
    status: b.status === "unknown" ? "muted" : b.status,
    l2tp: b.l2tp || b.ospf, bgp_wg: b.bgp_wg, bgp_ovpn: b.bgp_ovpn,
    ping_ms: b.ping_ms,
    _branch: b,
  }));

  const vmservers = servers.map(s => ({
    name: s.name, ip: s.ip, role: s.role, city: "HQ",
    org: s.org === "selectel" ? "otr-it" : s.org || "luch",
    status: s.status || "muted",
  }));

  const wazuhAgents = agents.map(a => ({
    name: a.name, ip: a.ip || "—", role: "Wazuh Agent", city: a.group || "—",
    org: "luch",
    status: a.status === "active" ? "ok" : a.status === "disconnected" ? "crit" : "muted",
    lastSeen: a.last_seen,
  }));

  /* PCs = agents whose group doesn't look like a server group */
  const serverGroups = new Set(["SRV", "DC", "EXCHANGE", "ADFS"]);
  const pcAgents = wazuhAgents.filter(a => !serverGroups.has((a.city || "").toUpperCase().split("-")[0]));

  const wifi = apList.map(ap => ({
    name: ap.name || ap.mac, ip: ap.ip || "—", role: "WiFi AP", city: ap.site || "HQ",
    org: "luch", status: ap.status === "connected" ? "ok" : ap.status === "isolated" ? "warn" : "crit",
    mac: ap.mac,
  }));

  const nvrRows = nvrs.map(n => ({
    name: n.name, ip: n.ip || "—", role: "NVR", city: "—",
    org: "luch", status: n.status,
    channels: n.channels,
  }));

  /* Cameras from NVR channels (flatten) */
  const cameras = nvrs.flatMap(n =>
    (n.channels_list || []).map((ch, i) => ({
      name: `${n.name} · Ch${i + 1}`, ip: n.ip || "—", role: "IP Camera", city: "—",
      org: "luch", status: ch.status || n.status,
    }))
  );

  const vpnServers = [
    ...branches.filter(b => b.bgp_wg === "up").map(b => ({
      name: `WG-${b.name}`, ip: b.wg_ip || "—", role: "WireGuard Endpoint", city: b.city || "—",
      org: "luch", status: "ok",
    })),
    ...branches.filter(b => b.bgp_ovpn === "up").map(b => ({
      name: `OVPN-${b.name}`, ip: b.ovpn_ip || "—", role: "OpenVPN Endpoint", city: b.city || "—",
      org: "luch", status: "ok",
    })),
  ];

  const TABS = [
    { k: "routers",  label: t("Routers",       "Маршрутизаторы"), icon: "globe",    rows: routers },
    { k: "vmserver", label: t("VMs / Servers",  "Серверы/ВМ"),     icon: "server",   rows: vmservers },
    { k: "wifi",     label: t("Wi-Fi",          "Wi-Fi"),           icon: "wifi",     rows: wifi },
    { k: "cameras",  label: t("Cameras",        "Камеры"),          icon: "eye",      rows: cameras },
    { k: "nvr",      label: t("NVR / DVR",      "NVR/DVR"),         icon: "hdd",      rows: nvrRows },
    { k: "agents",   label: t("Wazuh Agents",   "Агенты Wazuh"),    icon: "cpu",      rows: wazuhAgents },
    { k: "pcs",      label: t("PC's",           "ПК"),              icon: "cpu",      rows: pcAgents },
    { k: "vpn",      label: t("VPN Servers",    "VPN серверы"),     icon: "activity", rows: vpnServers },
    { k: "switches", label: t("Switches",       "Коммутаторы"),     icon: "server",   rows: [] },
    { k: "mobiles",  label: t("Mobiles",        "Мобильные"),       icon: "truck",    rows: [] },
    { k: "generic",  label: t("Generic",        "Прочие сети"),     icon: "globe",    rows: [] },
  ];

  const activeTab = TABS.find(tt => tt.k === tab) || TABS[0];
  const lq = q.toLowerCase();
  const activeRows = activeTab.rows.filter(r =>
    !q || r.name.toLowerCase().includes(lq) || (r.ip || "").includes(lq) || (r.city || "").toLowerCase().includes(lq)
  );

  /* Column definitions per tab */
  const colsByTab = {
    routers: [
      { header: "", width: 36, cell: r => <StatusDot status={r.status} live={r.status === "crit"}/> },
      { header: t("Name", "Имя"), mono: true, cell: r => r.name },
      { header: "Loopback IP", mono: true, width: 130, cell: r => r.ip },
      { header: t("City", "Город"), width: 120, cell: r => <span style={{ color: "var(--fg-2)" }}>{r.city}</span> },
      { header: t("Org", "Орг."), width: 80, cell: r => <OrgBadge org={r.org}/> },
      { header: "L2TP OSPF", width: 90, align: "center", cell: r => <TunnelDot val={r.l2tp} ok="full"/> },
      { header: "WireGuard", width: 90, align: "center", cell: r => <TunnelDot val={r.bgp_wg} ok="up"/> },
      { header: "OpenVPN", width: 90, align: "center", cell: r => <TunnelDot val={r.bgp_ovpn} ok="up"/> },
      { header: "Ping", width: 70, align: "right", mono: true, cell: r => <span style={{ color: "var(--fg-3)" }}>{r.ping_ms != null ? `${r.ping_ms}ms` : "—"}</span> },
      { header: "SSH", width: 50, cell: r => (
        <button onClick={e => { e.stopPropagation(); setSshTarget(r._branch); }}
          title="Open SSH terminal"
          style={{ background: "transparent", border: "1px solid var(--border-2)", borderRadius: 4, color: "var(--fg-3)", cursor: "pointer", padding: "2px 6px", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          &gt;_
        </button>
      )},
    ],
    vmserver: [
      { header: "", width: 36, cell: r => <StatusDot status={r.status} live={r.status === "crit"}/> },
      { header: t("Name", "Имя"), mono: true, cell: r => r.name },
      { header: "IP", mono: true, width: 140, cell: r => r.ip },
      { header: t("Role", "Роль"), cell: r => <span style={{ color: "var(--fg-2)" }}>{r.role}</span> },
      { header: t("Org", "Орг."), width: 90, cell: r => <OrgBadge org={r.org}/> },
      { header: "Status", width: 100, cell: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
    agents: [
      { header: "", width: 36, cell: r => <StatusDot status={r.status} live={r.status === "crit"}/> },
      { header: t("Agent", "Агент"), mono: true, cell: r => r.name },
      { header: "IP", mono: true, width: 130, cell: r => r.ip },
      { header: t("Group", "Группа"), width: 120, cell: r => <span style={{ color: "var(--fg-2)" }}>{r.city}</span> },
      { header: t("Org", "Орг."), width: 80, cell: r => <OrgBadge org={r.org}/> },
      { header: t("Last seen", "Был на связи"), mono: true, width: 160, cell: r => <span style={{ color: "var(--fg-3)" }}>{fmtUtc5(r.lastSeen)}</span> },
      { header: "Status", width: 100, cell: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
    wifi: [
      { header: "", width: 36, cell: r => <StatusDot status={r.status}/> },
      { header: t("Name", "Имя"), mono: true, cell: r => r.name },
      { header: "IP", mono: true, width: 130, cell: r => r.ip },
      { header: "MAC", mono: true, width: 140, cell: r => <span style={{ color: "var(--fg-3)" }}>{r.mac || "—"}</span> },
      { header: t("Site", "Площадка"), width: 120, cell: r => <span style={{ color: "var(--fg-2)" }}>{r.city}</span> },
      { header: "Status", width: 100, cell: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  };

  const defaultCols = [
    { header: "", width: 36, cell: r => <StatusDot status={r.status || "muted"}/> },
    { header: t("Name", "Имя"), mono: true, cell: r => r.name },
    { header: "IP", mono: true, width: 140, cell: r => r.ip || "—" },
    { header: t("Role", "Роль"), cell: r => <span style={{ color: "var(--fg-2)" }}>{r.role}</span> },
    { header: t("City / Site", "Город"), width: 130, cell: r => <span style={{ color: "var(--fg-2)" }}>{r.city}</span> },
    { header: t("Org", "Орг."), width: 80, cell: r => <OrgBadge org={r.org || "luch"}/> },
    { header: "Status", width: 100, cell: r => <Badge status={r.status || "muted"}>{r.status || "—"}</Badge> },
  ];

  const columns = colsByTab[tab] || defaultCols;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div className="t-section">{t("Inventory", "Учёт")}</div>
          <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Hosts", "Хосты")}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button iconLeft="download">{t("Export", "Экспорт")}</Button>
          <Button variant="primary" iconLeft="plus">{t("Add host", "Добавить хост")}</Button>
        </div>
      </div>

      {/* Tabs — scrollable horizontal */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-2)", overflowX: "auto" }}>
        {TABS.map(tt => (
          <button key={tt.k} onClick={() => setTab(tt.k)} style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px", whiteSpace: "nowrap",
            background: "transparent", border: 0,
            borderBottom: `2px solid ${tab === tt.k ? "var(--accent)" : "transparent"}`,
            color: tab === tt.k ? "var(--fg-1)" : "var(--fg-3)", fontSize: 13, cursor: "pointer", marginBottom: -1,
          }}>
            <Icon name={tt.icon} size={13}/>
            {tt.label}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 3, padding: "1px 5px" }}>
              {tt.rows.length}
            </span>
          </button>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Input value={q} onChange={e => setQ(e.target.value)}
          placeholder={t("Filter by name, IP or city…", "Фильтр по имени, IP или городу…")}
          iconLeft="search" style={{ width: 300 }}/>
        <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
          {t("Showing", "Показано")} <span style={{ color: "var(--fg-1)" }}>{activeRows.length}</span>
        </span>
      </div>

      {/* Table or empty */}
      {activeRows.length === 0
        ? <EmptyState icon={activeTab.icon} title={t("No data", "Нет данных")}
            description={activeTab.rows.length === 0
              ? t("This collector is not yet configured.", "Коллектор для этой категории ещё не настроен.")
              : t("Nothing matches the filter.", "Нет совпадений для фильтра.")}/>
        : <Table getRowKey={r => r.name + r.ip} columns={columns} rows={activeRows}/>
      }

      {sshTarget && <TerminalModal branch={sshTarget} onClose={() => setSshTarget(null)}/>}
    </div>
  );
}

function TunnelDot({ val, ok }) {
  const isOk = val === ok;
  const isUnknown = !val || val === "unknown";
  const color = isOk ? "var(--status-ok)" : isUnknown ? "var(--fg-3)" : "var(--status-crit)";
  return (
    <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 14, color }}>
      {isOk ? "●" : isUnknown ? "–" : "○"}
    </div>
  );
}

Object.assign(window, { Inventory });
