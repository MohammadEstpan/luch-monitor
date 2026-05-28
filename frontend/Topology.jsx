/* TK-Luch · Topology — Leaflet real-world map + grid view */

const STATUS_COLOR = { ok: "#10B981", warn: "#F59E0B", crit: "#FF3B30", unknown: "#6B7A99", muted: "#6B7A99" };
const HQ_COORDS    = [55.1644, 61.4368]; // Chelyabinsk

const CITY_COORDS = {
  "Екатеринбург":    [56.8519, 60.6122],
  "Серов":           [59.6008, 60.5754],
  "Тобольск":        [58.1960, 68.2535],
  "Реж":             [57.3668, 61.3883],
  "Орск":            [51.2302, 58.4748],
  "Сибай":           [52.7222, 58.6757],
  "Челябинск":       [55.1644, 61.4368],
  "Нижневартовск":   [60.9345, 76.5526],
  "Карталы":         [53.0588, 60.6424],
  "Асбест":          [57.0002, 61.4560],
  "Нефтекамск":      [56.0987, 54.2658],
  "Нефтеюганск":     [61.1009, 72.6012],
  "Ханты-Мансийск":  [61.0044, 69.0151],
  "Троицк":          [54.0844, 61.5661],
  "Пермь":           [58.0105, 56.2502],
  "Набережные Челны":[55.7432, 52.4214],
  "Нижний Тагил":    [57.9124, 59.9715],
  "Аша":             [54.9857, 57.2696],
  "Учалы":           [54.3096, 59.3764],
  "Уфа":             [54.7388, 55.9721],
  "Кыштым":          [55.7066, 60.5581],
  "Курган":          [55.4408, 65.3411],
  "Усть-Катав":      [54.9339, 58.1710],
  "Березники":       [59.4149, 56.8088],
  "Стерлитамак":     [53.6202, 55.9347],
  "Коркино":         [54.8847, 61.4099],
  "Трёхгорный":      [54.8191, 58.4526],
  "Снежинск":        [56.0857, 60.7279],
  "Озёрск":          [55.7700, 60.7001],
  "Чебаркуль":       [54.9848, 60.3820],
  "Миасс":           [55.0537, 60.1048],
  "Копейск":         [55.1076, 61.6190],
  "Южноуральск":     [54.4486, 61.2559],
  "Астана":          [51.1801, 71.4460],
  "Костанай":        [53.2144, 63.6241],
  "Алматы":          [43.2220, 76.8512],
  "Самара":          [53.1959, 50.1496],
  "Магнитогорск":    [53.4072, 59.0410],
  "Шадринск":        [56.0874, 63.6349],
  "Новый Уренгой":   [66.0809, 76.6783],
  "Белорецк":        [53.9540, 58.3927],
  "Кваркено":        [51.0681, 59.6978],
  "Юрюзань":         [54.8593, 58.4293],
  "Ишим":            [56.1119, 69.4748],
  "Ноябрьск":        [63.1989, 75.4574],
  "Оренбург":        [51.7727, 55.0988],
  "Первоуральск":    [56.9086, 59.9419],
  "Сатка":           [55.0521, 58.9737],
  "Златоуст":        [55.1716, 59.6548],
  "Ижевск":          [56.8527, 53.2114],
  "Тюмень":          [57.1530, 68.9816],
  "Верхний Уфалей":  [56.0616, 60.2350],
  "Чусовой":         [58.2993, 57.8088],
};

function worstStatus(branches) {
  const rank = { crit: 3, warn: 2, unknown: 1, ok: 0 };
  let w = "ok";
  for (const b of branches) if ((rank[b.status] || 0) > (rank[w] || 0)) w = b.status;
  return w;
}

/* ─── Leaflet map component ──────────────────────────────────────────────── */
function LeafletMap({ branches, selected, onSelect }) {
  const containerRef   = React.useRef(null);
  const mapRef         = React.useRef(null);
  const markersRef     = React.useRef(null);
  const linesRef       = React.useRef(null);

  /* Initialize map once */
  React.useEffect(() => {
    if (!window.L || !containerRef.current) return;
    const L = window.L;

    const map = L.map(containerRef.current, {
      center: [57.5, 64.0],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
    });

    /* CartoDB dark tiles — free, no API key */
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> &copy; <a href='https://carto.com/attributions'>CARTO</a>",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current     = map;
    markersRef.current = L.layerGroup().addTo(map);
    linesRef.current   = L.layerGroup().addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* Update markers & lines when data changes */
  React.useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current) return;
    markersRef.current.clearLayers();
    linesRef.current.clearLayers();

    /* HQ marker */
    const hqIcon = L.divIcon({
      className: "",
      html: `<div style="width:32px;height:32px;border-radius:50%;background:#3B82F6;border:2px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,0.25);display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:9px;font-weight:700;color:#fff">HQ</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16],
    });
    L.marker(HQ_COORDS, { icon: hqIcon, zIndexOffset: 1000 })
      .bindTooltip("HQ · Chelyabinsk · 10.255.255.1", { className: "luch-tooltip", direction: "right" })
      .addTo(markersRef.current);

    /* Group by city */
    const byCity = {};
    for (const b of branches) {
      const city = b.city || "—";
      if (!byCity[city]) byCity[city] = [];
      byCity[city].push(b);
    }

    for (const [city, cityBranches] of Object.entries(byCity)) {
      const coords = CITY_COORDS[city];
      if (!coords) continue;
      const status = worstStatus(cityBranches);
      const color  = STATUS_COLOR[status];
      const isSel  = selected?.city === city;

      /* Tunnel lines — one per active tunnel type */
      const hasWg   = cityBranches.some(b => b.bgp_wg === "up");
      const hasOvpn = cityBranches.some(b => b.bgp_ovpn === "up");
      const hasL2tp = cityBranches.some(b => b.l2tp === "full" || b.ospf === "full");

      if (hasWg)   L.polyline([HQ_COORDS, coords], { color: "#10B981", weight: isSel ? 2 : 1, opacity: isSel ? 0.7 : 0.35 }).addTo(linesRef.current);
      if (hasOvpn) L.polyline([HQ_COORDS, coords], { color: "#22D3EE", weight: isSel ? 2 : 1, opacity: isSel ? 0.65 : 0.3 }).addTo(linesRef.current);
      if (hasL2tp) L.polyline([HQ_COORDS, coords], { color: "#F59E0B", weight: isSel ? 2 : 1, opacity: isSel ? 0.6 : 0.25 }).addTo(linesRef.current);
      if (status === "crit") L.polyline([HQ_COORDS, coords], { color: "#FF3B30", weight: 1.5, opacity: 0.7, dashArray: "6 4" }).addTo(linesRef.current);

      /* City circle marker */
      const radius = Math.max(6, Math.min(16, 4 + cityBranches.length * 1.2));
      const upCount = cityBranches.filter(b => b.status === "ok").length;

      const circle = L.circleMarker(coords, {
        radius,
        fillColor: color,
        color: isSel ? "#fff" : "rgba(255,255,255,0.5)",
        weight: isSel ? 2.5 : 1,
        opacity: 1,
        fillOpacity: isSel ? 1 : 0.8,
        pane: "markerPane",
      });

      circle.bindTooltip(
        `<b>${city}</b><br>${upCount}/${cityBranches.length} online`,
        { className: "luch-tooltip", direction: "top", offset: [0, -radius] }
      );
      circle.on("click", () => onSelect({ city, branches: cityBranches, status }));
      circle.addTo(markersRef.current);
    }
  }, [branches, selected]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }}/>;
}

/* ─── Main Topology screen ───────────────────────────────────────────────── */
function Topology() {
  const t = useT();
  const { data, refresh } = useData();
  const branches = data?.branches ?? [];
  const sum      = data?.summary ?? {};

  const [selected,     setSelected]     = React.useState(null);
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [view,         setView]         = React.useState("map");

  /* Compute city-level data */
  const cities = React.useMemo(() => {
    const map = {};
    for (const b of branches) {
      const city = b.city || "—";
      if (!map[city]) map[city] = { city, branches: [] };
      map[city].branches.push(b);
    }
    return Object.values(map).map(c => ({ ...c, status: worstStatus(c.branches) }))
                             .sort((a, b) => {
                               const r = { crit: 0, warn: 1, unknown: 2, ok: 3 };
                               return (r[a.status] ?? 2) - (r[b.status] ?? 2);
                             });
  }, [branches]);

  const visibleBranches = filterStatus === "all"
    ? [...branches].sort((a, b) => { const r = { crit:0,warn:1,unknown:2,ok:3 }; return (r[a.status]??2)-(r[b.status]??2); })
    : branches.filter(b => b.status === filterStatus);

  const l2tpUp = branches.filter(b => b.l2tp === "full" || b.ospf === "full").length;
  const wgUp   = branches.filter(b => b.bgp_wg === "up").length;
  const ovpnUp = branches.filter(b => b.bgp_ovpn === "up").length;
  const critN  = branches.filter(b => b.status === "crit").length;

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

      {/* Tunnel legend / stats */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { label: "L2TP OSPF",    val: l2tpUp, color: "#F59E0B" },
          { label: "WireGuard",    val: wgUp,   color: "#10B981" },
          { label: "OpenVPN",      val: ovpnUp, color: "#22D3EE" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "6px 12px" }}>
            <div style={{ width: 24, height: 3, background: s.color, borderRadius: 2 }}/>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>{s.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: s.val > 0 ? "var(--status-ok)" : "var(--fg-3)", fontWeight: 600 }}>{s.val}</span>
          </div>
        ))}
        {critN > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-surface)", border: "1px solid var(--crit-border)", borderRadius: 6, padding: "6px 12px" }}>
            <StatusDot status="crit" live size={8}/>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--status-crit)" }}>{critN} {t("DOWN", "НЕТ СВЯЗИ")}</span>
          </div>
        )}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", marginLeft: "auto" }}>
          {sum.branches_up ?? 0} / {sum.branches_total ?? 0}
        </span>
      </div>

      {/* Main: map/grid + right panel */}
      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {view === "map" ? (
            <div style={{ flex: 1, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border-2)" }}>
              {window.L
                ? <LeafletMap branches={branches} selected={selected} onSelect={setSelected}/>
                : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-3)", fontSize: 12 }}>
                    {t("Loading map…", "Загрузка карты…")}
                  </div>
              }
            </div>
          ) : (
            /* Grid view */
            <div style={{ flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, overflow: "auto", padding: 12 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {["all","ok","warn","crit","unknown"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    padding: "4px 10px", borderRadius: 999, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-mono)",
                    background: filterStatus === s ? STATUS_COLOR[s === "all" ? "ok" : s] : "var(--bg-raised)",
                    border: `1px solid ${filterStatus === s ? STATUS_COLOR[s === "all" ? "ok" : s] : "var(--border-2)"}`,
                    color: filterStatus === s ? "#fff" : "var(--fg-2)",
                  }}>{s.toUpperCase()} {s !== "all" && `(${branches.filter(b => b.status === s).length})`}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
                {visibleBranches.map(b => (
                  <div key={b.id} onClick={() => setSelected(selected?.id === b.id ? null : b)} style={{
                    padding: "8px 10px", borderRadius: 5, cursor: "pointer",
                    background: selected?.id === b.id ? "var(--accent-soft)" : "var(--bg-raised)",
                    border: `1px solid ${selected?.id === b.id ? "var(--info-border)" : STATUS_COLOR[b.status] + "55"}`,
                    borderLeft: `3px solid ${STATUS_COLOR[b.status]}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <StatusDot status={b.status} live={b.status === "crit"} size={6}/>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{b.name}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--fg-3)", marginBottom: 4 }}>{b.city}</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[["L", b.l2tp === "full" || b.ospf === "full"], ["W", b.bgp_wg === "up"], ["V", b.bgp_ovpn === "up"]].map(([lbl, up]) => (
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
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {selected ? (
            <Card style={{ overflowY: "auto", maxHeight: "calc(100% - 8px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, color: "var(--fg-1)" }}>
                    {selected.name || selected.city}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{selected.city || "—"}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "transparent", border: 0, color: "var(--fg-3)", cursor: "pointer" }}>
                  <Icon name="x" size={14}/>
                </button>
              </div>

              {/* City selected → list branches with accordion */}
              {selected.branches ? (
                <div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>
                    {selected.branches.filter(b => b.status === "ok").length}/{selected.branches.length} {t("online", "онлайн")}
                  </div>
                  {selected.branches.map(b => (
                    <div key={b.id} onClick={() => setSelected(b)} style={{
                      display: "flex", alignItems: "flex-start", gap: 8, padding: "8px",
                      borderRadius: 4, marginBottom: 4, cursor: "pointer", background: "var(--bg-app)",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--bg-app)"}>
                      <StatusDot status={b.status} live={b.status === "crit"} size={7} style={{ marginTop: 2 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-1)" }}>{b.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
                          {b.lo}
                          {" · "}
                          {[b.l2tp === "full" && "L", b.bgp_wg === "up" && "WG", b.bgp_ovpn === "up" && "OVPN"].filter(Boolean).join(" ")}
                        </div>
                      </div>
                      <Badge status={b.status}>{b.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single branch selected */
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "7px 14px", fontSize: 12, marginBottom: 16 }}>
                    <span style={{ color: "var(--fg-3)" }}>Loopback</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{selected.lo}</span>
                    <span style={{ color: "var(--fg-3)" }}>Status</span>
                    <span><Badge status={selected.status}>{selected.status}</Badge></span>
                    <span style={{ color: "var(--fg-3)" }}>L2TP OSPF</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: (selected.l2tp === "full" || selected.ospf === "full") ? "var(--status-ok)" : "var(--status-crit)" }}>
                      {selected.l2tp || selected.ospf || "unknown"}
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
                  <Button size="sm" variant="ghost" onClick={() => setSelected({ city: selected.city, branches: branches.filter(b => b.city === selected.city), status: selected.status })}>
                    ← {t("All in", "Все в")} {selected.city}
                  </Button>
                </>
              )}
            </Card>
          ) : (
            /* City health list */
            <Card section={t("Cities", "Города")} title={t("By status", "По статусу")} style={{ flex: 1, overflowY: "auto" }}>
              {cities.map(c => (
                <div key={c.city} onClick={() => setSelected(c)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 4, cursor: "pointer", background: "var(--bg-app)", marginBottom: 3 }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--bg-app)"}>
                  <StatusDot status={c.status} live={c.status === "crit"} size={7}/>
                  <span style={{ fontSize: 12, color: "var(--fg-1)", flex: 1 }}>{c.city}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>
                    {c.branches.filter(b => b.status === "ok").length}/{c.branches.length}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Topology });
