/* TK-Luch · Logs — 4-view: Stream | Analytics | By Agent | Categorized */

const SEV_MAP   = { crit: "ERROR", warn: "WARN", info: "INFO" };
const LVL_COLOR = { ERROR: "var(--status-crit)", WARN: "var(--status-warn)", INFO: "var(--status-info)", DEBUG: "var(--fg-3)" };

function _normalize(alerts) {
  return (alerts || []).map(a => ({
    lvl: SEV_MAP[a.sev] || "INFO",
    ts: fmtUtc5(a.ts),
    ts_short: fmtUtc5Short(a.ts),
    src: [a.agent, a.group].filter(Boolean).join(" · ") || "wazuh",
    agent: a.agent || "—",
    group: a.group || "—",
    msg: a.rule || "",
    full_log: a.full_log || "",
    _ts: a.ts ? new Date(a.ts).getTime() : null,
    _id: a.id || String(Math.random()),
  }));
}

function _normalizeSyslog(events) {
  const SEV = { crit: "ERROR", warn: "WARN", info: "INFO" };
  return (events || []).map(e => {
    const isoTs = new Date(e.ts * 1000).toISOString();
    return {
      lvl: SEV[e.sev] || "INFO",
      ts: fmtUtc5(isoTs),
      ts_short: fmtUtc5Short(isoTs),
      src: `syslog · ${e.hostname || e.src || "?"}`,
      agent: e.hostname || e.src || "syslog",
      group: e.facility || "syslog",
      msg: e.msg || "",
      full_log: e.msg || "",
      _ts: e.ts ? e.ts * 1000 : null,
      _id: `sl-${e.ts}-${Math.random()}`,
      _source: "syslog",
    };
  });
}

function _catOf(log) {
  if (log._source === "syslog") return "network";
  const m = (log.msg + " " + log.src).toLowerCase();
  if (/login|auth|password|logon|authentication|session opened|session closed/.test(m)) return "auth";
  if (/network|interface|firewall|blocked|drop|deny|port|connection|traffic|route/.test(m)) return "network";
  if (log.lvl === "ERROR" || log.lvl === "WARN") return "security";
  return "system";
}

function Logs() {
  const t = useT();
  const { lang } = useLang();
  const { data } = useData();
  const wsAlerts = data?.wazuh?.recent_alerts ?? [];

  const [view, setView] = React.useState("stream");
  const [allLogs, setAllLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [limit, setLimit] = React.useState(200);

  React.useEffect(() => {
    if (wsAlerts.length > 0 && allLogs.length === 0) {
      setAllLogs(_normalize(wsAlerts));
    }
  }, [wsAlerts]);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const [wazuhRes, syslogRes] = await Promise.all([
        fetch(`/api/logs?limit=${limit}`),
        fetch(`/api/syslog?limit=500`),
      ]);
      const wazuhLogs   = wazuhRes.ok   ? await wazuhRes.json()   : [];
      const syslogEvts  = syslogRes.ok  ? await syslogRes.json()  : [];
      const combined = [..._normalize(wazuhLogs), ..._normalizeSyslog(syslogEvts)];
      combined.sort((a, b) => (b._ts || 0) - (a._ts || 0));
      setAllLogs(combined);
    } catch (e) { console.error("logs fetch:", e); }
    setLoading(false);
  }, [limit]);

  React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const counts = {
    total: allLogs.length,
    error: allLogs.filter(l => l.lvl === "ERROR").length,
    warn:  allLogs.filter(l => l.lvl === "WARN").length,
    info:  allLogs.filter(l => l.lvl === "INFO").length,
  };

  const VIEWS = [
    { k: "stream",      icon: "message",  en: "Live Stream",  ru: "Поток" },
    { k: "analytics",   icon: "activity", en: "Analytics",    ru: "Аналитика" },
    { k: "hierarchy",   icon: "server",   en: "By Agent",     ru: "По агентам" },
    { k: "categorized", icon: "filter",   en: "Categorized",  ru: "По типу" },
  ];

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div className="t-section">{t("Observability", "Наблюдаемость")}</div>
          <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Logs", "Логи")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: loading ? "var(--status-warn)" : "var(--status-ok)" }}>
            {loading ? "●  " + t("fetching…", "загрузка…") : `●  ${counts.total} ${t("events", "событий")}`}
          </span>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{
            height: 28, padding: "0 6px", background: "var(--bg-input)", border: "1px solid var(--border-2)",
            borderRadius: 4, color: "var(--fg-2)", fontSize: 11, fontFamily: "var(--font-mono)",
          }}>
            {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <Button iconLeft="refresh" onClick={fetchLogs}>{t("Reload", "Обновить")}</Button>
        </div>
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-2)", flexShrink: 0 }}>
        {VIEWS.map(v => (
          <button key={v.k} onClick={() => setView(v.k)} style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px",
            background: "transparent", border: 0,
            borderBottom: `2px solid ${view === v.k ? "var(--accent)" : "transparent"}`,
            color: view === v.k ? "var(--fg-1)" : "var(--fg-3)", fontSize: 13, cursor: "pointer", marginBottom: -1,
          }}>
            <Icon name={v.icon} size={13}/>
            {lang === "ru" ? v.ru : v.en}
          </button>
        ))}
      </div>

      {/* View content */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {view === "stream"     && <LogStream      logs={allLogs} counts={counts} t={t}/>}
        {view === "analytics"  && <LogAnalytics   logs={allLogs} counts={counts} t={t}/>}
        {view === "hierarchy"  && <LogHierarchy   logs={allLogs} t={t}/>}
        {view === "categorized"&& <LogCategorized logs={allLogs} t={t} lang={lang}/>}
      </div>
    </div>
  );
}

/* ─── Stream view ─────────────────────────────────────────────────────────── */
function LogStream({ logs, counts, t }) {
  const [filterLvl, setFilterLvl] = React.useState("all");
  const [q, setQ] = React.useState("");

  const visible = logs.filter(l => {
    if (filterLvl !== "all" && l.lvl !== filterLvl) return false;
    if (q) {
      const ql = q.toLowerCase();
      return l.msg.toLowerCase().includes(ql) || l.src.toLowerCase().includes(ql);
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Input value={q} onChange={e => setQ(e.target.value)}
          placeholder={t("Filter by rule or agent…", "Поиск по правилу или агенту…")}
          iconLeft="search" style={{ maxWidth: 400 }}/>
        <div style={{ display: "flex", gap: 4 }}>
          {[["all", t("All", "Все"), counts.total], ["ERROR","ERROR",counts.error], ["WARN","WARN",counts.warn], ["INFO","INFO",counts.info]].map(([k, lbl, cnt]) => (
            <button key={k} onClick={() => setFilterLvl(k)} style={{
              height: 26, padding: "0 10px", borderRadius: 999, cursor: "pointer", fontSize: 11, fontFamily: "var(--font-mono)",
              background: filterLvl === k ? (LVL_COLOR[k] ? LVL_COLOR[k] + "22" : "var(--accent-soft)") : "var(--bg-surface)",
              border: `1px solid ${filterLvl === k ? (LVL_COLOR[k] || "var(--info-border)") : "var(--border-2)"}`,
              color: filterLvl === k ? (LVL_COLOR[k] || "var(--accent)") : "var(--fg-2)",
            }}>
              {lbl} <span style={{ color: "var(--fg-3)" }}>{cnt}</span>
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
          {visible.length} {t("shown", "показано")}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, overflow: "auto" }}>
        <LogHistogram logs={logs}/>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "4px 0" }}>
          {visible.length === 0
            ? <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)" }}>{t("No events", "Нет событий")}</div>
            : visible.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "170px 60px 160px 1fr", gap: 12, padding: "5px 14px" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ color: "var(--fg-3)" }}>{l.ts}</span>
                <span style={{ color: LVL_COLOR[l.lvl], fontWeight: 600 }}>{l.lvl}</span>
                <span style={{ color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.src}</span>
                <span style={{ color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.msg}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Analytics view ─────────────────────────────────────────────────────── */
function LogAnalytics({ logs, counts, t }) {
  const topAgents = React.useMemo(() => {
    const m = {};
    for (const l of logs) { m[l.agent] = (m[l.agent] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, cnt]) => ({ name, cnt }));
  }, [logs]);

  const topRules = React.useMemo(() => {
    const m = {};
    for (const l of logs) { m[l.msg] = (m[l.msg] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([rule, cnt]) => ({ rule, cnt }));
  }, [logs]);

  const maxAgent = Math.max(1, ...topAgents.map(a => a.cnt));
  const maxRule  = Math.max(1, ...topRules.map(r => r.cnt));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: t("Total events", "Всего событий"), val: counts.total, color: "var(--fg-1)" },
          { label: "P1 / ERROR",  val: counts.error, color: "var(--status-crit)" },
          { label: "P2 / WARN",   val: counts.warn,  color: "var(--status-warn)" },
          { label: "INFO",        val: counts.info,  color: "var(--status-info)" },
        ].map(c => (
          <div key={c.label} style={{ padding: "12px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: c.color }}>{c.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Top agents */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, padding: 16 }}>
          <div className="t-section" style={{ marginBottom: 12 }}>{t("Top agents by events", "Топ агентов")}</div>
          {topAgents.length === 0
            ? <div style={{ color: "var(--fg-3)", fontSize: 12 }}>{t("No data", "Нет данных")}</div>
            : topAgents.map(a => (
              <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)", width: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                <div style={{ flex: 1, height: 10, background: "var(--ink-200)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(a.cnt / maxAgent) * 100}%`, background: "var(--accent)", borderRadius: 2 }}/>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", width: 30, textAlign: "right" }}>{a.cnt}</span>
              </div>
            ))
          }
        </div>

        {/* Top rules */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, padding: 16 }}>
          <div className="t-section" style={{ marginBottom: 12 }}>{t("Top triggered rules", "Топ правил")}</div>
          {topRules.length === 0
            ? <div style={{ color: "var(--fg-3)", fontSize: 12 }}>{t("No data", "Нет данных")}</div>
            : topRules.map(r => (
              <div key={r.rule} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)", width: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.rule}</span>
                <div style={{ width: 80, height: 10, background: "var(--ink-200)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                  <div style={{ height: "100%", width: `${(r.cnt / maxRule) * 100}%`, background: "var(--status-warn)", borderRadius: 2 }}/>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--status-warn)", width: 30, textAlign: "right" }}>{r.cnt}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, padding: 16 }}>
        <div className="t-section" style={{ marginBottom: 10 }}>{t("Event timeline (last 60 min)", "События за 60 мин")}</div>
        <LogHistogram logs={logs} height={60} showLabels/>
      </div>
    </div>
  );
}

/* ─── Hierarchy view ─────────────────────────────────────────────────────── */
function LogHierarchy({ logs, t }) {
  const byAgent = React.useMemo(() => {
    const m = {};
    for (const l of logs) {
      if (!m[l.agent]) m[l.agent] = { agent: l.agent, group: l.group, logs: [], err: 0, warn: 0, info: 0 };
      m[l.agent].logs.push(l);
      if (l.lvl === "ERROR") m[l.agent].err++;
      else if (l.lvl === "WARN") m[l.agent].warn++;
      else m[l.agent].info++;
    }
    return Object.values(m).sort((a, b) => (b.err - a.err) || (b.warn - a.warn) || b.logs.length - a.logs.length);
  }, [logs]);

  const [open, setOpen] = React.useState({});
  const toggle = id => setOpen(o => ({ ...o, [id]: !o[id] }));

  if (byAgent.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
      <EmptyState icon="cpu" title={t("No agent data", "Нет данных агентов")} description={t("Waiting for Wazuh events…", "Ожидание событий Wazuh…")}/>
    </div>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6 }}>
      {byAgent.map(ag => {
        const isOpen = open[ag.agent];
        const worst = ag.err > 0 ? "crit" : ag.warn > 0 ? "warn" : "info";
        return (
          <div key={ag.agent}>
            <div onClick={() => toggle(ag.agent)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              cursor: "pointer", borderBottom: "1px solid var(--border-1)",
              background: isOpen ? "var(--accent-soft)" : "transparent",
            }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}>
              <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={12} style={{ color: "var(--fg-3)", flex: "0 0 12px" }}/>
              <StatusDot status={worst} live={worst === "crit"} size={7}/>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-1)", flex: 1 }}>{ag.agent}</span>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{ag.group}</span>
              <div style={{ display: "flex", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {ag.err  > 0 && <span style={{ color: "var(--status-crit)" }}>E:{ag.err}</span>}
                {ag.warn > 0 && <span style={{ color: "var(--status-warn)" }}>W:{ag.warn}</span>}
                <span style={{ color: "var(--fg-3)" }}>I:{ag.info}</span>
                <span style={{ color: "var(--fg-3)", marginLeft: 4 }}>{ag.logs.length}</span>
              </div>
            </div>
            {isOpen && ag.logs.map((l, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "110px 56px 1fr", gap: 12,
                padding: "5px 14px 5px 36px", fontFamily: "var(--font-mono)", fontSize: 11,
                borderBottom: "1px solid var(--border-1)", background: "var(--bg-app)",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--bg-app)"}>
                <span style={{ color: "var(--fg-3)" }}>{l.ts_short}</span>
                <span style={{ color: LVL_COLOR[l.lvl], fontWeight: 600 }}>{l.lvl}</span>
                <span style={{ color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.msg}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Categorized view ───────────────────────────────────────────────────── */
function LogCategorized({ logs, t, lang }) {
  const [cat, setCat] = React.useState("security");

  const CATS = [
    { k: "security", en: "Security",  ru: "Безопасность", color: "var(--status-crit)" },
    { k: "auth",     en: "Auth",      ru: "Авторизация",  color: "var(--status-warn)" },
    { k: "network",  en: "Network",   ru: "Сеть",         color: "var(--status-info)" },
    { k: "system",   en: "System",    ru: "Система",      color: "var(--fg-3)" },
  ];

  const filtered = logs.filter(l => _catOf(l) === cat);
  const counts = Object.fromEntries(CATS.map(c => [c.k, logs.filter(l => _catOf(l) === c.k).length]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {CATS.map(c => (
          <button key={c.k} onClick={() => setCat(c.k)} style={{
            height: 28, padding: "0 12px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontFamily: "var(--font-mono)",
            background: cat === c.k ? `${c.color}22` : "var(--bg-surface)",
            border: `1px solid ${cat === c.k ? c.color : "var(--border-2)"}`,
            color: cat === c.k ? c.color : "var(--fg-2)",
          }}>
            {lang === "ru" ? c.ru : c.en} <span style={{ color: "var(--fg-3)" }}>({counts[c.k]})</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, overflow: "auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "4px 0" }}>
          {filtered.length === 0
            ? <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)" }}>{t("No events in this category", "Нет событий в этой категории")}</div>
            : filtered.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "170px 60px 160px 1fr", gap: 12, padding: "5px 14px" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ color: "var(--fg-3)" }}>{l.ts}</span>
                <span style={{ color: LVL_COLOR[l.lvl], fontWeight: 600 }}>{l.lvl}</span>
                <span style={{ color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.src}</span>
                <span style={{ color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.msg}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Shared histogram strip ──────────────────────────────────────────────── */
function LogHistogram({ logs, height = 40, showLabels = false }) {
  const buckets = React.useMemo(() => {
    const arr = Array(60).fill(null).map(() => ({ total: 0, err: 0 }));
    if (!logs.length) return arr;
    const now = Date.now();
    for (const l of logs) {
      if (!l._ts) continue;
      const age = (now - l._ts) / 1000;
      if (age > 3600 || age < 0) continue;
      const idx = Math.min(59, Math.floor(age / 60));
      arr[59 - idx].total++;
      if (l.lvl === "ERROR") arr[59 - idx].err++;
    }
    return arr;
  }, [logs]);
  const maxVal = Math.max(1, ...buckets.map(b => b.total));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", height, gap: 1, padding: showLabels ? "6px 14px 0" : "6px 14px", borderBottom: "1px solid var(--border-1)" }}>
      {buckets.map((b, i) => (
        <div key={i} style={{
          flex: 1,
          height: Math.max(2, (b.total / maxVal) * (height - 12)),
          background: b.err > 0 ? "var(--status-crit)" : "var(--accent)",
          opacity: b.total > 0 ? 0.75 : 0.15,
          borderRadius: 1,
        }}/>
      ))}
    </div>
  );
}

Object.assign(window, { Logs });
