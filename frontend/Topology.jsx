/* TK-Luch · Topology — live branch network map */

const STATUS_COLOR = { ok: "#10B981", warn: "#F59E0B", crit: "#FF3B30", unknown: "#6B7A99", muted: "#6B7A99" };
const HQ_POS = { x: 500, y: 230 };
const SVG_W = 1000, SVG_H = 460;

function worstStatus(branches) {
  const rank = { crit: 3, warn: 2, unknown: 1, ok: 0 };
  let best = "ok";
  for (const b of branches) {
    if ((rank[b.status] || 0) > (rank[best] || 0)) best = b.status;
  }
  return best;
}

function cityPositions(cities) {
  /* Place Ural cities in a rough geographic layout around HQ (Chelyabinsk center) */
  const GEO = {
    "Нижневартовск":   { x: 0.32, y: 0.14 },
    "Нефтеюганск":     { x: 0.42, y: 0.12 },
    "Нефтекамск":      { x: 0.22, y: 0.18 },
    "Ноябрьск":        { x: 0.55, y: 0.08 },
    "Новый Уренгой":   { x: 0.47, y: 0.06 },
    "Ханты-Мансийск":  { x: 0.37, y: 0.17 },
    "Тюмень":          { x: 0.60, y: 0.27 },
    "Тобольск":        { x: 0.65, y: 0.19 },
    "Ишим":            { x: 0.68, y: 0.33 },
    "Серов":           { x: 0.41, y: 0.20 },
    "Реж":             { x: 0.47, y: 0.26 },
    "Асбест":          { x: 0.52, y: 0.28 },
    "Екатеринбург":    { x: 0.49, y: 0.30 },
    "Шадринск":        { x: 0.57, y: 0.39 },
    "Курган":          { x: 0.62, y: 0.43 },
    "Пермь":           { x: 0.23, y: 0.33 },
    "Березники":       { x: 0.21, y: 0.26 },
    "Чусовой":         { x: 0.27, y: 0.30 },
    "Ижевск":          { x: 0.21, y: 0.41 },
    "Набережные Челны":{ x: 0.28, y: 0.42 },
    "Нижний Тагил":    { x: 0.41, y: 0.27 },
    "Аша":             { x: 0.30, y: 0.48 },
    "Усть-Катав":      { x: 0.27, y: 0.51 },
    "Трёхгорный":      { x: 0.32, y: 0.50 },
    "Златоуст":        { x: 0.37, y: 0.52 },
    "Верхний Уфалей":  { x: 0.40, y: 0.48 },
    "Кыштым":          { x: 0.41, y: 0.51 },
    "Снежинск":        { x: 0.44, y: 0.53 },
    "Озёрск":          { x: 0.44, y: 0.56 },
    "Чебаркуль":       { x: 0.42, y: 0.58 },
    "Миасс":           { x: 0.40, y: 0.60 },
    "Челябинск":       { x: 0.50, y: 0.55 },
    "Копейск":         { x: 0.52, y: 0.58 },
    "Южноуральск":     { x: 0.47, y: 0.63 },
    "Троицк":          { x: 0.51, y: 0.67 },
    "Коркино":         { x: 0.50, y: 0.62 },
    "Сатка":           { x: 0.34, y: 0.55 },
    "Юрюзань":         { x: 0.33, y: 0.58 },
    "Уфа":             { x: 0.28, y: 0.57 },
    "Стерлитамак":     { x: 0.29, y: 0.62 },
    "Учалы":           { x: 0.36, y: 0.65 },
    "Белорецк":        { x: 0.34, y: 0.68 },
    "Сибай":           { x: 0.35, y: 0.73 },
    "Магнитогорск":    { x: 0.39, y: 0.75 },
    "Карталы":         { x: 0.51, y: 0.74 },
    "Кваркено":        { x: 0.49, y: 0.77 },
    "Орск":            { x: 0.54, y: 0.78 },
    "Оренбург":        { x: 0.45, y: 0.84 },
    "Самара":          { x: 0.38, y: 0.86 },
    "Астана":          { x: 0.56, y: 0.88 },
    "Костанай":        { x: 0.42, y: 0.88 },
    "Алматы":          { x: 0.72, y: 0.90 },
  };
  return cities.map(c => {
    const g = GEO[c.city];
    return {
      ...c,
      x: g ? g.x * SVG_W : HQ_POS.x,
      y: g ? g.y * SVG_H : HQ_POS.y,
    };
  });
}

function Topology() {
  const t = useT();
  const { data, refresh } = useData();
  const branches = data?.branches ?? [];
  const sum = data?.summary ?? {};

  const [selected, setSelected] = React.useState(null);
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [view, setView] = React.useState("map"); // "map" | "grid"

  const cities = React.useMemo(() => {
    const map = {};
    for (const b of branches) {
      const city = b.city || "—";
      if (!map[city]) map[city] = { city, branches: [] };
      map[city].branches.push(b);
    }
    return Object.values(map).map(c => ({ ...c, status: worstStatus(c.branches) }));
  }, [branches]);

  const cityNodes = React.useMemo(() => cityPositions(cities), [cities]);
  const cityMap = Object.fromEntries(cityNodes.map(c => [c.city, c]));

  const visibleBranches = filterStatus === "all"
    ? [...branches].sort((a, b) => {
        const r = { crit: 0, warn: 1, unknown: 2, ok: 3 };
        return (r[a.status] ?? 2) - (r[b.status] ?? 2);
      })
    : branches.filter(b => b.status === filterStatus);

  const ospfUp   = branches.filter(b => b.ospf === "full").length;
  const wgUp     = branches.filter(b => b.bgp_wg === "up").length;
  const ovpnUp   = branches.filter(b => b.bgp_ovpn === "up").length;
  const critCount = branches.filter(b => b.status === "crit").length;
  const unknCount = branches.filter(b => b.status === "unknown").length;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="t-section">{t("Inventory", "Учёт")}</div>
          <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Topology", "Топология")}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <WsStatusBadge/>
          <Button iconLeft="refresh" onClick={refresh}>{t("Refresh", "Обновить")}</Button>
          <Button onClick={() => setView(v => v === "map" ? "grid" : "map")}>
            {view === "map" ? t("Grid view", "Сетка") : t("Map view", "Карта")}
          </Button>
        </div>
      </div>

      {/* Tunnel stats bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "OSPF Full", val: ospfUp, total: branches.filter(b => b.ospf !== "unknown").length, color: "#3B82F6" },
          { label: "WireGuard BGP", val: wgUp, total: branches.filter(b => b.bgp_wg !== "unknown").length, color: "#10B981" },
          { label: "OpenVPN BGP", val: ovpnUp, total: branches.filter(b => b.bgp_ovpn !== "unknown").length, color: "#22D3EE" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "6px 12px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }}/>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>{s.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: s.val === s.total ? "var(--status-ok)" : "var(--status-warn)", fontWeight: 600 }}>
              {s.val}<span style={{ color: "var(--fg-3)", fontWeight: 400 }}>/{s.total}</span>
            </span>
          </div>
        ))}
        {critCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-surface)", border: "1px solid var(--crit-border)", borderRadius: 6, padding: "6px 12px" }}>
            <StatusDot status="crit" live size={8}/>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--status-crit)" }}>{critCount} {t("DOWN", "НЕТ СВЯЗИ")}</span>
          </div>
        )}
        {unknCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "6px 12px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{unknCount} {t("unknown", "неизвестно")}</span>
          </div>
        )}
      </div>

      {/* Main area */}
      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
        {/* Map / Grid */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {view === "map" ? (
            <Card style={{ flex: 1, padding: 0, overflow: "hidden" }}>
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%", height: "100%", display: "block" }}>
                <defs>
                  <pattern id="tgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0L0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width={SVG_W} height={SVG_H} fill="url(#tgrid)"/>

                {/* Lines from each city to nearest branch positions (HQ hub) */}
                {cityNodes.map(c => (
                  <line key={c.city}
                    x1={HQ_POS.x} y1={HQ_POS.y}
                    x2={c.x} y2={c.y}
                    stroke={STATUS_COLOR[c.status]}
                    strokeWidth={c.status === "crit" ? "1.5" : "1"}
                    strokeOpacity={c.status === "ok" ? 0.25 : 0.6}
                    strokeDasharray={c.status === "crit" ? "4 3" : "0"}
                  />
                ))}

                {/* HQ node */}
                <g style={{ cursor: "pointer" }} onClick={() => setSelected(null)}>
                  <circle cx={HQ_POS.x} cy={HQ_POS.y} r={32} fill="var(--bg-raised)" stroke="var(--accent)" strokeWidth="2"/>
                  <text x={HQ_POS.x} y={HQ_POS.y - 3} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, fill: "var(--accent)" }}>HQ</text>
                  <text x={HQ_POS.x} y={HQ_POS.y + 10} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--fg-3)" }}>CHE</text>
                </g>

                {/* City nodes */}
                {cityNodes.map(c => {
                  const r = Math.max(10, Math.min(20, 8 + c.branches.length * 1.5));
                  const isSelected = selected?.city === c.city;
                  return (
                    <g key={c.city} style={{ cursor: "pointer" }}
                       onClick={() => setSelected(isSelected ? null : c)}>
                      {c.status === "crit" && (
                        <circle cx={c.x} cy={c.y} r={r + 8} fill="none" stroke={STATUS_COLOR.crit} strokeWidth="1" opacity="0.3">
                          <animate attributeName="r" values={`${r+4};${r+14};${r+4}`} dur="2s" repeatCount="indefinite"/>
                          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
                        </circle>
                      )}
                      <circle cx={c.x} cy={c.y} r={r}
                        fill={isSelected ? STATUS_COLOR[c.status] : "var(--bg-raised)"}
                        stroke={STATUS_COLOR[c.status]}
                        strokeWidth={isSelected ? 0 : 1.5}
                        fillOpacity={isSelected ? 0.9 : 1}
                      />
                      <text x={c.x} y={c.y + 4} textAnchor="middle"
                        style={{ fontFamily: "var(--font-mono)", fontSize: Math.max(7, r * 0.55),
                                 fill: isSelected ? "#fff" : "var(--fg-2)", pointerEvents: "none" }}>
                        {c.branches.length}
                      </text>
                      <text x={c.x} y={c.y + r + 11} textAnchor="middle"
                        style={{ fontFamily: "var(--font-sans)", fontSize: 9, fill: "var(--fg-3)", pointerEvents: "none" }}>
                        {c.city.length > 10 ? c.city.slice(0, 9) + "…" : c.city}
                      </text>
                    </g>
                  );
                })}

                {/* Legend */}
                <g transform="translate(16, 428)">
                  {[["ok","OK"],["warn","WARN"],["crit","DOWN"],["unknown","?"]].map(([s,lbl],i) => (
                    <g key={s} transform={`translate(${i * 80}, 0)`}>
                      <circle cx={6} cy={-3} r={5} fill="none" stroke={STATUS_COLOR[s]} strokeWidth="1.5"/>
                      <text x={15} y={0} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--fg-3)" }}>{lbl}</text>
                    </g>
                  ))}
                </g>
              </svg>
            </Card>
          ) : (
            /* Grid view */
            <Card style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {["all","ok","warn","crit","unknown"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    padding: "4px 10px", borderRadius: 999, fontSize: 11, cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    background: filterStatus === s ? STATUS_COLOR[s === "all" ? "ok" : s] : "var(--bg-surface)",
                    border: `1px solid ${filterStatus === s ? STATUS_COLOR[s === "all" ? "ok" : s] : "var(--border-2)"}`,
                    color: filterStatus === s ? "#fff" : "var(--fg-2)",
                  }}>{s.toUpperCase()} {s !== "all" && `(${branches.filter(b => b.status === s).length})`}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
                {visibleBranches.map(b => (
                  <div key={b.id}
                    onClick={() => setSelected(selected?.id === b.id ? null : b)}
                    style={{
                      padding: "8px 10px", borderRadius: 5, cursor: "pointer",
                      background: selected?.id === b.id ? "var(--accent-soft)" : "var(--bg-surface)",
                      border: `1px solid ${selected?.id === b.id ? "var(--info-border)" : STATUS_COLOR[b.status] + "55"}`,
                      borderLeft: `3px solid ${STATUS_COLOR[b.status]}`,
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <StatusDot status={b.status} live={b.status === "crit"} size={6}/>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {b.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--fg-3)", marginBottom: 4 }}>{b.city}</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[["O", b.ospf === "full"], ["W", b.bgp_wg === "up"], ["V", b.bgp_ovpn === "up"]].map(([lbl, up]) => (
                        <span key={lbl} style={{
                          fontFamily: "var(--font-mono)", fontSize: 9, padding: "1px 4px", borderRadius: 2,
                          background: up ? "rgba(16,185,129,0.15)" : "rgba(255,59,48,0.12)",
                          color: up ? "#10B981" : "#FF3B30",
                        }}>{lbl}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Detail panel */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Selection detail */}
          {selected ? (
            <Card style={{ flex: "0 0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, color: "var(--fg-1)" }}>
                    {selected.name || selected.city}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{selected.city || "—"}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "transparent", border: 0, color: "var(--fg-3)", cursor: "pointer" }}>
                  <Icon name="x" size={14}/>
                </button>
              </div>

              {/* If city node selected, list its branches */}
              {selected.branches ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
                  {selected.branches.map(b => (
                    <div key={b.id} onClick={() => setSelected(b)} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                      borderRadius: 4, background: "var(--bg-app)", cursor: "pointer",
                    }}>
                      <StatusDot status={b.status} live={b.status === "crit"} size={7}/>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, flex: 1 }}>{b.name}</span>
                      <Badge status={b.status}>{b.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                /* Branch detail */
                <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 12px", fontSize: 12 }}>
                  <span style={{ color: "var(--fg-3)" }}>Loopback</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{selected.lo}</span>
                  <span style={{ color: "var(--fg-3)" }}>Status</span>
                  <span><Badge status={selected.status}>{selected.status}</Badge></span>
                  <span style={{ color: "var(--fg-3)" }}>OSPF</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: selected.ospf === "full" ? "var(--status-ok)" : selected.ospf === "unknown" ? "var(--fg-3)" : "var(--status-crit)" }}>
                    {selected.ospf}
                  </span>
                  <span style={{ color: "var(--fg-3)" }}>WireGuard</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: selected.bgp_wg === "up" ? "var(--status-ok)" : selected.bgp_wg === "unknown" ? "var(--fg-3)" : "var(--status-crit)" }}>
                    {selected.bgp_wg}
                  </span>
                  <span style={{ color: "var(--fg-3)" }}>OpenVPN</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: selected.bgp_ovpn === "up" ? "var(--status-ok)" : selected.bgp_ovpn === "unknown" ? "var(--fg-3)" : "var(--status-crit)" }}>
                    {selected.bgp_ovpn}
                  </span>
                  <span style={{ color: "var(--fg-3)" }}>Ping</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: selected.ping_ms ? "var(--status-ok)" : "var(--fg-3)" }}>
                    {selected.ping_ms != null ? `${selected.ping_ms} ms` : "—"}
                  </span>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div style={{ color: "var(--fg-3)", fontSize: 12, textAlign: "center", padding: 12 }}>
                {t("Click a city or branch", "Нажмите на город или филиал")}
              </div>
            </Card>
          )}

          {/* City health list */}
          <Card section={t("Cities", "Города")} title={t("By status", "По статусу")} style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {cityNodes
                .sort((a, b) => {
                  const r = { crit: 0, warn: 1, unknown: 2, ok: 3 };
                  return (r[a.status] ?? 2) - (r[b.status] ?? 2);
                })
                .map(c => (
                  <div key={c.city} onClick={() => setSelected(selected?.city === c.city ? null : c)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                      borderRadius: 4, cursor: "pointer",
                      background: selected?.city === c.city ? "var(--accent-soft)" : "var(--bg-app)",
                    }}>
                    <StatusDot status={c.status} live={c.status === "crit"} size={7}/>
                    <span style={{ fontSize: 12, color: "var(--fg-1)", flex: 1 }}>{c.city}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>
                      {c.branches.filter(b => b.status === "ok").length}/{c.branches.length}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Topology });
