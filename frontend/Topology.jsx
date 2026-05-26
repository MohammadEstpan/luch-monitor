/* TK-Luch · Topology screen — depot map + hosts grid */

const TOPO_NODES = [
  { id: "MSK", x: 380, y: 200, label: "МСК", en: "Moscow",        ru: "Москва",          hosts: 142, status: "warn" },
  { id: "SPB", x: 270, y: 110, label: "СПБ", en: "St Petersburg", ru: "Санкт-Петербург", hosts: 96,  status: "warn" },
  { id: "EKB", x: 580, y: 240, label: "ЕКБ", en: "Yekaterinburg", ru: "Екатеринбург",    hosts: 64,  status: "warn" },
  { id: "NSK", x: 760, y: 260, label: "НСК", en: "Novosibirsk",   ru: "Новосибирск",     hosts: 78,  status: "ok"   },
  { id: "KZN", x: 480, y: 220, label: "КЗН", en: "Kazan",         ru: "Казань",          hosts: 41,  status: "crit" },
  { id: "DC",  x: 400, y: 360, label: "DC",  en: "Tier-III DC",   ru: "ЦОД Tier-III",    hosts: 0,   status: "ok",   hub: true },
];
const TOPO_LINKS = [
  ["MSK", "DC"], ["SPB", "MSK"], ["KZN", "MSK"], ["EKB", "KZN"], ["NSK", "EKB"], ["SPB", "DC"],
];
const STATUS_COLOR = { ok: "#10B981", warn: "#F59E0B", crit: "#FF3B30", muted: "#6B7A99" };

function Topology() {
  const t = useT();
  const { lang } = useLang();
  const [hover, setHover] = React.useState(null);
  const map = Object.fromEntries(TOPO_NODES.map(n => [n.id, n]));
  const nameOf = n => lang === "ru" ? n.ru : n.en;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-section">{t("Inventory", "Учёт")}</div>
          <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Topology", "Топология")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button iconLeft="refresh">{t("Refresh", "Обновить")}</Button>
          <Button>{t("Layout: depots", "Раскладка: депо")}</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, flex: 1, minHeight: 0 }}>
        <Card section={t("Network map · 2026-05-26 14:08 MSK", "Карта сети · 2026-05-26 14:08 MSK")} title={t("Inter-depot links", "Связи между депо")} style={{ display: "flex", flexDirection: "column", padding: 0 }}>
          <div style={{ padding: 16, paddingTop: 0, flex: 1, position: "relative", minHeight: 380 }}>
            <svg viewBox="0 0 880 440" style={{ width: "100%", height: "100%", display: "block" }}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="880" height="440" fill="url(#grid)"/>

              {TOPO_LINKS.map(([a, b], i) => {
                const A = map[a], B = map[b];
                const sev = a === "KZN" || b === "KZN" ? "crit" : (a === "MSK" || b === "MSK") && (a === "SPB" || b === "SPB" || a === "EKB" || b === "EKB") ? "warn" : "ok";
                return (
                  <g key={i}>
                    <line x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                          stroke={STATUS_COLOR[sev]} strokeWidth="1.5" strokeOpacity={sev === "ok" ? 0.4 : 0.85}
                          strokeDasharray={sev === "crit" ? "4 4" : "0"}/>
                    {sev === "crit" && (
                      <circle r="4" fill={STATUS_COLOR.crit}>
                        <animateMotion dur="2s" repeatCount="indefinite" path={`M${A.x} ${A.y} L${B.x} ${B.y}`}/>
                      </circle>
                    )}
                  </g>
                );
              })}

              {TOPO_NODES.map(n => (
                <g key={n.id} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
                  <circle cx={n.x} cy={n.y} r={n.hub ? 36 : 28} fill="var(--bg-raised)" stroke={STATUS_COLOR[n.status]} strokeWidth="2"/>
                  {n.status === "crit" && <circle cx={n.x} cy={n.y} r={n.hub ? 36 : 28} fill="none" stroke={STATUS_COLOR.crit} strokeWidth="2" opacity="0.4"><animate attributeName="r" values={`${n.hub ? 36 : 28};${n.hub ? 52 : 44};${n.hub ? 36 : 28}`} dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/></circle>}
                  <text x={n.x} y={n.y + 5} textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, fill: "var(--fg-1)" }}>{lang === "ru" ? n.label : n.id}</text>
                  <text x={n.x} y={n.y + (n.hub ? 56 : 48)} textAnchor="middle" style={{ fontFamily: "var(--font-sans)", fontSize: 11, fill: "var(--fg-3)" }}>{nameOf(n)}</text>
                  {!n.hub && <text x={n.x} y={n.y + (n.hub ? 70 : 62)} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: STATUS_COLOR[n.status] }}>{n.hosts} {t("hosts", "хостов")}</text>}
                </g>
              ))}

              <g transform="translate(20, 400)">
                <text x="0" y="0" style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--fg-3)", letterSpacing: "0.08em" }}>{t("LINKS", "СВЯЗИ")}</text>
                <line x1="50" y1="-3" x2="80" y2="-3" stroke={STATUS_COLOR.ok} strokeWidth="1.5" strokeOpacity="0.6"/>
                <text x="86" y="0" style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--fg-2)" }}>{t("healthy", "здоров")}</text>
                <line x1="160" y1="-3" x2="190" y2="-3" stroke={STATUS_COLOR.warn} strokeWidth="1.5"/>
                <text x="196" y="0" style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--fg-2)" }}>{t("degraded", "деградация")}</text>
                <line x1="290" y1="-3" x2="320" y2="-3" stroke={STATUS_COLOR.crit} strokeWidth="1.5" strokeDasharray="4 4"/>
                <text x="326" y="0" style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--fg-2)" }}>{t("down", "недоступно")}</text>
              </g>
            </svg>

            {hover && (
              <div style={{ position: "absolute", top: 16, right: 16, background: "var(--bg-raised)", border: "1px solid var(--border-2)", borderRadius: 6, padding: 12, minWidth: 180, boxShadow: "var(--shadow-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <StatusDot status={hover.status} live={hover.status === "crit"} size={8}/>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{lang === "ru" ? hover.label : hover.id} · {nameOf(hover)}</div>
                </div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{hover.hosts} {t("hosts", "хостов")} · {hover.status.toUpperCase()}</div>
              </div>
            )}
          </div>
        </Card>

        <Card section={t("Depots", "Депо")} title={t("By health", "По состоянию")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TOPO_NODES.filter(n => !n.hub).sort((a, b) => ({ crit: 0, warn: 1, ok: 2 }[a.status] - { crit: 0, warn: 1, ok: 2 }[b.status])).map(n => (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-app)", borderRadius: 5, border: `1px solid ${n.status === "crit" ? "var(--crit-border)" : "var(--border-2)"}` }}>
                <StatusDot status={n.status} live={n.status === "crit"} size={10}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{lang === "ru" ? n.label : n.id}</span>
                    <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{nameOf(n)}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{n.hosts} {t("hosts", "хостов")}</div>
                </div>
                <Icon name="chevronRight" size={14} style={{ color: "var(--fg-3)" }}/>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { Topology });
