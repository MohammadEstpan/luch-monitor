/* TK-Luch · Logs explorer */

const LOG_LINES = [
  { ts: "14:08:38.412", lvl: "ERROR", src: "probe.icmp",    msg: "host=srv-msk-04 err=timeout after=5000ms" },
  { ts: "14:08:38.034", lvl: "INFO",  src: "alert.fire",    msg: "rule=host_unreachable_12m target=srv-msk-04 sev=critical" },
  { ts: "14:08:33.412", lvl: "WARN",  src: "probe.icmp",    msg: "host=srv-msk-04 rtt=4821ms threshold=2000ms" },
  { ts: "14:08:28.401", lvl: "WARN",  src: "probe.icmp",    msg: "host=srv-msk-04 rtt=3142ms threshold=2000ms" },
  { ts: "14:08:23.408", lvl: "WARN",  src: "probe.icmp",    msg: "host=srv-msk-04 rtt=2918ms threshold=2000ms" },
  { ts: "14:08:18.022", lvl: "INFO",  src: "agent.health",  msg: "agent=agent-msk-02 cpu=12% mem=44% queue=18" },
  { ts: "14:08:17.991", lvl: "DEBUG", src: "store.tsdb",    msg: "flushed 412 series block=msk-1.6h compressed=14.2MB" },
  { ts: "14:08:14.118", lvl: "INFO",  src: "probe.http",    msg: "url=https://wms.luch.ru/health code=200 ms=18" },
  { ts: "14:08:12.882", lvl: "ERROR", src: "probe.tcp",     msg: "host=db-kzn-01 port=5432 err=connection refused" },
  { ts: "14:08:09.401", lvl: "WARN",  src: "rule.engine",   msg: "rule=cpu_high_5m matched host=db-kzn-01 value=92" },
  { ts: "14:08:08.001", lvl: "INFO",  src: "agent.ingest",  msg: "from=agent-spb-02 metrics=842 lag=120ms" },
  { ts: "14:08:04.911", lvl: "INFO",  src: "probe.icmp",    msg: "host=srv-spb-01 rtt=22ms loss=0%" },
  { ts: "14:08:01.222", lvl: "DEBUG", src: "store.tsdb",    msg: "compaction.tick queue=4 idle=true" },
  { ts: "14:07:58.404", lvl: "INFO",  src: "alert.resolve", msg: "rule=disk_high target=srv-msk-12 by=user:dk" },
  { ts: "14:07:51.118", lvl: "INFO",  src: "probe.http",    msg: "url=https://billing.luch.ru/health code=200 ms=38" },
  { ts: "14:07:48.401", lvl: "WARN",  src: "probe.tcp",     msg: "host=srv-ekb-08 port=22 rtt=512ms threshold=200ms" },
];

const LVL_COLOR = { ERROR: "var(--status-crit)", WARN: "var(--status-warn)", INFO: "var(--status-info)", DEBUG: "var(--fg-3)" };

function Logs() {
  const t = useT();
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-section">{t("Observability", "Наблюдаемость")}</div>
          <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Logs", "Логи")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <span className="t-meta" style={{ fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--status-ok)" }}>●</span> {t("streaming", "стрим")} · 412 {t("lines/s", "строк/с")}
          </span>
          <Button iconLeft="clock">{t("Last 1 h", "Последний 1 ч")}</Button>
          <Button iconLeft="download">{t("Export", "Экспорт")}</Button>
        </div>
      </div>

      {/* Query */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: "var(--bg-input)", border: "1px solid var(--border-2)", borderRadius: 4, padding: "0 10px", height: 36,
          fontFamily: "var(--font-mono)", fontSize: 12,
        }}>
          <Icon name="search" size={14} style={{ color: "var(--fg-3)" }}/>
          <span style={{ color: "var(--accent)" }}>host</span><span style={{ color: "var(--fg-3)" }}>:</span>
          <span style={{ color: "var(--brand-gold)" }}>"srv-msk-04"</span>
          <span style={{ color: "var(--fg-3)" }}>AND</span>
          <span style={{ color: "var(--accent)" }}>lvl</span><span style={{ color: "var(--fg-3)" }}>&gt;=</span>
          <span style={{ color: "var(--brand-gold)" }}>WARN</span>
          <span style={{ marginLeft: "auto", color: "var(--fg-3)" }}>412 {t("results", "результатов")} · 1 {t("h", "ч")}</span>
        </div>
        <Button variant="primary" iconLeft="search">{t("Run", "Запустить")}</Button>
        <Button>{t("Save", "Сохранить")}</Button>
      </div>

      {/* Level filter chips */}
      <div style={{ display: "flex", gap: 6 }}>
        {["ERROR", "WARN", "INFO", "DEBUG"].map(l => (
          <Chip key={l} active={l !== "DEBUG"}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: LVL_COLOR[l], display: "inline-block", marginRight: 6, verticalAlign: "middle" }}/>
            {l}
          </Chip>
        ))}
      </div>

      {/* Log stream */}
      <div style={{
        flex: 1, minHeight: 0, background: "var(--bg-surface)", border: "1px solid var(--border-2)",
        borderRadius: 6, overflow: "auto",
      }}>
        {/* histogram strip */}
        <div style={{ display: "flex", alignItems: "flex-end", height: 48, gap: 2, padding: "10px 14px", borderBottom: "1px solid var(--border-1)" }}>
          {Array.from({ length: 60 }, (_, i) => {
            const h = 6 + Math.abs(Math.sin(i * 0.6) * 26 + Math.cos(i * 0.27) * 8);
            const err = i > 50;
            return <div key={i} style={{ flex: 1, height: h, background: err ? "var(--status-crit)" : "var(--accent)", opacity: 0.7, borderRadius: 1 }}/>;
          })}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "8px 0" }}>
          {LOG_LINES.map((l, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "150px 64px 130px 1fr", gap: 14,
              padding: "5px 14px", color: "var(--fg-2)", cursor: "pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ color: "var(--fg-3)" }}>2026-05-26 {l.ts}</span>
              <span style={{ color: LVL_COLOR[l.lvl], fontWeight: 600 }}>{l.lvl}</span>
              <span style={{ color: "var(--accent)" }}>{l.src}</span>
              <span style={{ color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Logs });
