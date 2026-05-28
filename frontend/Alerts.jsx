/* TK-Luch · Alerts screen — live Wazuh data */

function _fmtAge(tsStr) {
  if (!tsStr) return "—";
  try {
    const diff = Math.floor((Date.now() - new Date(tsStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    return `${Math.floor(diff/3600)}h`;
  } catch { return "—"; }
}

function Alerts() {
  const t = useT();
  const { data } = useData();
  const user = useUser ? useUser() : null;
  const wazuh = data?.wazuh ?? {};
  const rawAlerts = wazuh.recent_alerts ?? [];
  const acks = data?.acks ?? {};
  const [sev, setSev] = React.useState("all");
  const [selected, setSelected] = React.useState(null);

  const doAck = async (id, kind = "ack") => {
    const owner = user?.name || "NOC";
    const url = kind === "mute" ? `/api/alerts/${id}/mute?minutes=60&owner=${encodeURIComponent(owner)}`
                                : `/api/alerts/${id}/${kind}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner }),
    });
  };

  const ALERT_DATA = rawAlerts.map((a, i) => {
    const id = a.id || `W-${i}`;
    const ackInfo = acks[id];
    return {
      id,
      sev: a.sev,
      title: a.rule,
      target: a.agent,
      depot: a.group || "—",
      fired: a.ts ? fmtUtc5Short(a.ts) + " UTC+5" : "—",
      age: _fmtAge(a.ts),
      ack: !!ackInfo,
      muted: ackInfo?.kind === "mute",
      owner: ackInfo?.owner || null,
      level: a.level,
    };
  });

  const rows = sev === "all" ? ALERT_DATA : ALERT_DATA.filter(a => a.sev === sev);
  const sel = selected ? ALERT_DATA.find(a => a.id === selected.id) || selected : null;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-section">{t("Observability", "Наблюдаемость")}</div>
            <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Alerts", "Алерты")}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Button iconLeft="filter">{t("Filter", "Фильтр")}</Button>
            <Button iconLeft="download">{t("Export CSV", "Экспорт CSV")}</Button>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span className="t-section" style={{ marginRight: 4 }}>{t("Severity", "Важность")}</span>
          {[
            { k: "all",  label: t("All",       "Все"),         cnt: ALERT_DATA.length },
            { k: "crit", label: t("Critical",  "Критические"), cnt: ALERT_DATA.filter(a => a.sev === "crit").length },
            { k: "warn", label: t("Warning",   "Предупр."),    cnt: ALERT_DATA.filter(a => a.sev === "warn").length },
            { k: "info", label: t("Info",      "Инфо"),        cnt: ALERT_DATA.filter(a => a.sev === "info").length },
          ].map(o => (
            <Chip key={o.k} active={sev === o.k} onClick={() => setSev(o.k)}>
              {o.label} <span style={{ color: "var(--fg-3)", marginLeft: 4 }}>{o.cnt}</span>
            </Chip>
          ))}
          <div style={{ width: 1, height: 18, background: "var(--border-2)", margin: "0 8px" }}/>
          <Chip>{t("Last 24 h", "За 24 ч")}</Chip>
          <Chip>{t("All depots", "Все депо")}</Chip>
          <Chip>{t("Unacknowledged", "Не подтверждены")}</Chip>
        </div>

        {/* Table */}
        <Table
          getRowKey={r => r.id}
          selectedKey={sel?.id}
          onRowClick={r => setSelected(r)}
          columns={[
            { header: t("Sev", "Важн."), width: 56, cell: r => <StatusDot status={r.sev} live={r.sev === "crit" && !r.ack}/> },
            { header: "ID", mono: true, width: 80, cell: r => r.id },
            { header: t("Alert", "Алерт"), cell: r => <span style={{ color: r.ack ? "var(--fg-2)" : "var(--fg-1)" }}>{r.title}</span> },
            { header: t("Target", "Цель"), mono: true, cell: r => r.target },
            { header: t("Depot", "Депо"), mono: true, width: 56, cell: r => <span style={{ color: "var(--fg-3)" }}>{r.depot}</span> },
            { header: t("Fired", "Сработал"), mono: true, width: 100, cell: r => r.fired + " MSK" },
            { header: t("Age", "Возраст"),   mono: true, width: 80, align: "right", cell: r => r.age },
            { header: t("Status", "Статус"), width: 120, cell: r =>
              r.muted ? <Badge status="muted">MUTED · {r.owner}</Badge>
              : r.ack  ? <Badge status="info">ACK · {r.owner}</Badge>
              : <Badge status={r.sev}>{r.sev === "crit" ? "P1" : r.sev === "warn" ? "P2" : "—"}</Badge>
            },
          ]}
          rows={rows}
        />
      </div>

      {/* Detail rail */}
      {sel && (
        <aside style={{
          flex: "0 0 380px", borderLeft: "1px solid var(--border-2)",
          background: "var(--bg-surface)", padding: 20, overflowY: "auto",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <Badge status={sel.sev} solid>{sel.sev === "crit" ? "P1" : sel.sev === "warn" ? "P2" : "INFO"}</Badge>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{sel.id}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-1)", lineHeight: 1.3 }}>{sel.title}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "transparent", border: 0, color: "var(--fg-3)", cursor: "pointer" }}><Icon name="x" size={16}/></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 14px", fontSize: 12, marginBottom: 18 }}>
            <span style={{ color: "var(--fg-3)" }}>{t("Target", "Цель")}</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{sel.target}</span>
            <span style={{ color: "var(--fg-3)" }}>{t("Depot", "Депо")}</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{sel.depot}</span>
            <span style={{ color: "var(--fg-3)" }}>{t("Fired", "Сработал")}</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>2026-05-26 {sel.fired} MSK</span>
            <span style={{ color: "var(--fg-3)" }}>{t("Age", "Возраст")}</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{sel.age}</span>
            <span style={{ color: "var(--fg-3)" }}>{t("Rule", "Правило")}</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>host_unreachable_12m</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {sel.ack
              ? <Button iconLeft="x" style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => doAck(sel.id, "unack")}>
                  {t("Unacknowledge", "Снять подтверждение")}
                </Button>
              : <Button variant="primary" iconLeft="check" style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => doAck(sel.id, "ack")}>
                  {t("Acknowledge", "Подтвердить")}
                </Button>
            }
            <Button iconLeft="mute" onClick={() => doAck(sel.id, "mute")}>
              {t("Mute 1 h", "Заглушить 1 ч")}
            </Button>
          </div>

          <div className="t-section" style={{ marginBottom: 10 }}>{t("Timeline", "Хронология")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18, position: "relative", paddingLeft: 14 }}>
            <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 1, background: "var(--border-2)" }}/>
            {[
              { c: "var(--status-crit)", time: "14:08:33", l: t("Alert fired · ICMP timeout (5 s)", "Алерт сработал · ICMP таймаут (5 с)") },
              { c: "var(--status-warn)", time: "14:04:21", l: t("RTT exceeded 2 000 ms · 3 consecutive probes", "RTT превысил 2 000 мс · 3 подряд пробы") },
              { c: "var(--fg-3)",        time: "14:00:00", l: t("Probe schedule began", "Расписание проб запущено") },
            ].map((e, i) => (
              <div key={i} style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: -14, top: 5, width: 9, height: 9, borderRadius: 999, background: e.c, border: "2px solid var(--bg-surface)" }}/>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{e.time} MSK</div>
                <div style={{ fontSize: 12, color: "var(--fg-1)" }}>{e.l}</div>
              </div>
            ))}
          </div>

          <div className="t-section" style={{ marginBottom: 8 }}>{t("Linked alerts (3)", "Связанные алерты (3)")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { id: "AL-4280", sev: "warn", en: "Packet loss to srv-msk-04",                  ru: "Потеря пакетов до srv-msk-04" },
              { id: "AL-4275", sev: "warn", en: "Latency spike edge-msk-1 → srv-msk-04",      ru: "Скачок задержки edge-msk-1 → srv-msk-04" },
              { id: "AL-4242", sev: "info", en: "Power event MSK-1 rack 4",                   ru: "Событие питания МСК-1, стойка 4" },
            ].map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 4, fontSize: 12, cursor: "pointer", background: "var(--bg-app)" }}>
                <StatusDot status={l.sev} size={6}/>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>{l.id}</span>
                <span style={{ color: "var(--fg-2)", flex: 1 }}>{lang === "ru" ? l.ru : l.en}</span>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

function Chip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px",
      borderRadius: 999, background: active ? "var(--accent-soft)" : "var(--bg-surface)",
      border: `1px solid ${active ? "var(--info-border)" : "var(--border-2)"}`,
      color: active ? "var(--accent)" : "var(--fg-2)",
      fontSize: 12, fontFamily: "var(--font-sans)", cursor: "pointer", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

Object.assign(window, { Alerts, Chip });
