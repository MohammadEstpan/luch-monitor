/* TK-Luch · App shell — Topbar + Sidebar + AppShell layout */

function Topbar({ envs, currentEnv, setCurrentEnv, onSearch, alertCount, user, onSignOut, data }) {
  const [meOpen, setMeOpen] = React.useState(false);
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <header style={{
      height: 52, background: "var(--bg-chrome)", borderBottom: "1px solid var(--border-2)",
      position: "relative", display: "flex", alignItems: "center", padding: "0 14px", gap: 12, flex: "0 0 52px",
    }}>
      {/* brand accent stripe */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: "linear-gradient(90deg, var(--brand-red) 0%, var(--brand-red-deep) 40%, var(--brand-gold) 100%)", opacity: 0.6 }}/>

      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 14, borderRight: "1px solid var(--border-2)", height: 36 }}>
        <img src="../../assets/brand-logo.svg" alt="Luch" style={{ height: 30, display: "block" }}/>
      </div>

      {/* env badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-surface)",
        border: "1px solid var(--border-2)", borderRadius: 4, padding: "0 10px", height: 28,
        color: "var(--fg-1)", fontFamily: "var(--font-mono)", fontSize: 12,
      }}>
        <StatusDot status="ok" live size={6}/>
        <span>{currentEnv}</span>
      </div>

      {/* search */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-input)",
        border: "1px solid var(--border-2)", borderRadius: 4, padding: "0 10px", height: 32,
        color: "var(--fg-3)", fontSize: 12, maxWidth: 480,
      }}>
        <Icon name="search" size={14}/>
        <span>{t("Search hosts, alerts, dashboards…", "Поиск хостов, алертов, дашбордов…")}</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", border: "1px solid var(--border-2)", borderRadius: 3, padding: "0 5px", lineHeight: "16px" }}>⌘ K</span>
      </div>

      <div style={{ flex: 1 }}/>

      {/* language switch */}
      <div style={{ display: "inline-flex", background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 4, padding: 2 }} role="group" aria-label="Language">
        {["en", "ru"].map(l => (
          <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} style={{
            background: lang === l ? "var(--accent-soft)" : "transparent",
            color: lang === l ? "var(--accent)" : "var(--fg-3)",
            border: 0, borderRadius: 3, padding: "4px 8px",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
            cursor: "pointer", textTransform: "uppercase",
          }}>{l}</button>
        ))}
      </div>

      {/* alerts bell */}
      <button style={{
        width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: 4, color: "var(--fg-2)", background: "transparent", border: 0, cursor: "pointer", position: "relative",
      }} title={t("Alerts", "Алерты")}>
        <Icon name="bell" size={16}/>
        {alertCount > 0 && (
          <span style={{
            position: "absolute", top: 4, right: 4, background: "var(--crit-400)", color: "#fff",
            fontSize: 9, fontWeight: 600, borderRadius: 999, padding: "1px 4px", lineHeight: 1,
          }}>{alertCount}</span>
        )}
      </button>

      {/* user */}
      <div style={{ position: "relative" }}>
        <button onClick={() => setMeOpen(o => !o)} style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 8px 4px 4px",
          borderRadius: 4, background: "transparent", border: 0, cursor: "pointer",
        }}>
          <span style={{ width: 24, height: 24, borderRadius: 4, background: "var(--accent)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{user.initials}</span>
          <span style={{ fontSize: 12, color: "var(--fg-1)" }}>{user.name}</span>
          <Icon name="chevronDown" size={12} style={{ color: "var(--fg-3)" }}/>
        </button>
        {meOpen && (
          <div style={{ position: "absolute", top: 40, right: 0, background: "var(--bg-raised)", border: "1px solid var(--border-2)", borderRadius: 6, boxShadow: "var(--shadow-2)", padding: 4, minWidth: 180, zIndex: 20 }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-1)", marginBottom: 4 }}>
              <div style={{ fontSize: 12, color: "var(--fg-1)" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{user.email}</div>
            </div>
            <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--fg-2)", cursor: "pointer", borderRadius: 3 }}>{t("Profile", "Профиль")}</div>
            <div onClick={onSignOut} style={{ padding: "6px 10px", fontSize: 12, color: "var(--status-crit)", cursor: "pointer", borderRadius: 3 }}>{t("Sign out", "Выйти")}</div>
          </div>
        )}
      </div>
    </header>
  );
}

function Sidebar({ nav, current, onNav }) {
  return (
    <aside style={{
      width: 232, background: "var(--bg-chrome)", borderRight: "1px solid var(--border-2)",
      padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2,
      flex: "0 0 232px", overflowY: "auto",
    }}>
      {nav.map((group, gi) => (
        <React.Fragment key={gi}>
          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600, padding: "14px 12px 6px" }}>{group.label}</div>
          {group.items.map(it => {
            const active = current === it.key;
            return (
              <div key={it.key} onClick={() => onNav(it.key)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                borderRadius: 5, fontSize: 13, cursor: "pointer", position: "relative",
                color: active ? "var(--accent)" : "var(--fg-2)",
                background: active ? "var(--accent-soft)" : "transparent",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--fg-1)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg-2)"; }}}>
                {active && <span style={{ position: "absolute", left: -8, top: 6, bottom: 6, width: 2, background: "var(--accent)", borderRadius: "0 2px 2px 0" }}/>}
                <Icon name={it.icon} size={16} style={{ flex: "0 0 16px" }}/>
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.count != null && (
                  <span style={{
                    fontSize: 10, fontFamily: "var(--font-mono)",
                    color: it.countTone ? `var(--status-${it.countTone})` : "var(--fg-3)",
                    background: it.countTone ? `var(--${it.countTone}-bg)` : "var(--bg-surface)",
                    border: `1px solid ${it.countTone ? `var(--${it.countTone}-border)` : "var(--border-2)"}`,
                    borderRadius: 3, padding: "1px 6px",
                  }}>{it.count}</span>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
      <div style={{ flex: 1 }}/>
      <SidebarVersionBlock/>
    </aside>
  );
}

function AppShell({ topbar, sidebar, children }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-app)" }}>
      {topbar}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {sidebar}
        <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
      </div>
    </div>
  );
}

function SidebarVersionBlock() {
  const { data } = useData();
  const t = useT();
  const v = data?.version ?? "2.4.1";
  const b = data?.build ?? "—";
  const ts = data?.ts;
  const syncTime = ts ? fmtUtc5Short(new Date(ts * 1000).toISOString()) : "—";
  return (
    <div style={{
      margin: "10px 6px", padding: "10px 12px", background: "var(--bg-surface)", border: "1px solid var(--border-2)",
      borderRadius: 6, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", lineHeight: 1.5,
    }}>
      <div style={{ color: "var(--fg-2)", fontWeight: 600, marginBottom: 4 }}>v {v} · build {b}</div>
      <div>{t("Last sync", "Синхронизация")} · {syncTime} UTC+5</div>
    </div>
  );
}

Object.assign(window, { Topbar, Sidebar, AppShell });
