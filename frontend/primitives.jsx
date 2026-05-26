/* TK-Luch monitoring · primitives + screens */
const { useState, useMemo, useEffect, useRef, createContext, useContext } = React;

/* ---------- Icon (inline Lucide subset, stroke 1.75) -------------- */
const ICONS = {
  layout: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  triangle: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z M12 9v4 M12 17h.01",
  server: "M2 2h20v8H2zM2 14h20v8H2zM6 6h.01M6 18h.01",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.07a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.07a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.07a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  plus: "M12 5v14M5 12h14",
  x: "M18 6 6 18M6 6l12 12",
  check: "M20 6 9 17l-5-5",
  chevronRight: "M9 18l6-6-6-6",
  chevronDown: "M6 9l6 6 6-6",
  chevronLeft: "M15 18l-6-6 6-6",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  cpu: "M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3",
  hdd: "M22 12H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11zM6 16h.01M10 16h.01",
  wifi: "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  database: "M12 2a8 3 0 1 0 0 6 8 3 0 0 0 0-6zM4 5v6a8 3 0 0 0 16 0V5M4 11v6a8 3 0 0 0 16 0v-6",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  mute: "M9 9v6h4l5 5V4l-5 5H9zM23 9l-6 6M17 9l6 6",
};
function Icon({ name, size = 16, className = "", style = {} }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      {d.split(" M").map((seg, i) => <path key={i} d={(i ? "M" : "") + seg} />)}
    </svg>
  );
}

/* ---------- Button ----------------------------------------------- */
function Button({ variant = "secondary", size = "md", iconLeft, iconRight, children, onClick, disabled, className = "", style = {}, type = "button" }) {
  const h = size === "sm" ? 26 : size === "lg" ? 40 : 32;
  const fs = size === "sm" ? 12 : size === "lg" ? 14 : 13;
  const padX = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const variants = {
    primary:   { background: "var(--accent)", color: "#fff", borderColor: "transparent" },
    secondary: { background: "var(--bg-surface)", color: "var(--fg-1)", borderColor: "var(--border-2)" },
    ghost:     { background: "transparent", color: "var(--fg-2)", borderColor: "transparent" },
    danger:    { background: "var(--crit-400)", color: "#fff", borderColor: "transparent" },
    brand:     { background: "var(--brand-red)", color: "#fff", borderColor: "transparent" },
    gold:      { background: "var(--brand-gold)", color: "var(--fg-on-gold)", borderColor: "transparent" },
  };
  const v = variants[variant] || variants.secondary;
  const isIcon = !children;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`btn btn--${variant} ${className}`} style={{
      display: "inline-flex", alignItems: "center", gap: 8, height: h, padding: isIcon ? 0 : `0 ${padX}px`, width: isIcon ? h : undefined,
      justifyContent: "center", borderRadius: 6, border: "1px solid", fontFamily: "var(--font-sans)", fontSize: fs, fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, transition: "background 120ms, border-color 120ms",
      whiteSpace: "nowrap", flexShrink: 0,
      ...v, ...style,
    }}>
      {iconLeft && <Icon name={iconLeft} size={size === "sm" ? 12 : 14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 12 : 14} />}
    </button>
  );
}

/* ---------- Badge -------------------------------------------------- */
function Badge({ status = "info", solid = false, pill = false, children }) {
  const tokens = {
    ok:    { bg: "var(--ok-bg)",    fg: "var(--ok-400)",    bd: "var(--ok-border)",    solidBg: "var(--ok-400)" },
    warn:  { bg: "var(--warn-bg)",  fg: "var(--warn-400)",  bd: "var(--warn-border)",  solidBg: "var(--warn-400)" },
    crit:  { bg: "var(--crit-bg)",  fg: "var(--crit-400)",  bd: "var(--crit-border)",  solidBg: "var(--crit-400)" },
    info:  { bg: "var(--info-bg)",  fg: "var(--info-400)",  bd: "var(--info-border)",  solidBg: "var(--info-400)" },
    muted: { bg: "var(--muted-bg)", fg: "var(--muted-400)", bd: "var(--muted-border)", solidBg: "var(--muted-400)" },
    gold:  { bg: "var(--brand-gold-soft)", fg: "var(--brand-gold)", bd: "rgba(255,204,1,0.32)", solidBg: "var(--brand-gold)" },
  };
  const t = tokens[status] || tokens.info;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: 20, padding: "0 8px",
      borderRadius: pill ? 999 : 4, border: solid ? 0 : "1px solid " + t.bd,
      background: solid ? t.solidBg : t.bg,
      color: solid ? (status === "warn" || status === "gold" ? "#1A1100" : "#fff") : t.fg,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
      fontFamily: "var(--font-sans)", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

/* ---------- StatusDot --------------------------------------------- */
function StatusDot({ status = "ok", live = false, size = 10 }) {
  const c = { ok: "var(--ok-400)", warn: "var(--warn-400)", crit: "var(--crit-400)", info: "var(--info-400)", muted: "var(--muted-400)" }[status];
  const glow = { ok: "var(--glow-ok)", warn: "var(--glow-warn)", crit: "var(--glow-crit)" }[status];
  return (
    <span className={live ? "sd-live" : ""} style={{
      display: "inline-block", width: size, height: size, borderRadius: 999,
      background: c, boxShadow: live && glow ? glow : "none", position: "relative", flex: `0 0 ${size}px`,
    }} />
  );
}

/* ---------- Card -------------------------------------------------- */
function Card({ title, section, action, children, status, raised, style = {} }) {
  const statusStyle = status ? { borderLeft: `3px solid var(--status-${status})` } : {};
  return (
    <div style={{
      background: raised ? "var(--bg-raised)" : "var(--bg-surface)",
      border: "1px solid var(--border-2)", borderRadius: 6, padding: 16,
      boxShadow: raised ? "var(--shadow-2)" : "none",
      ...statusStyle, ...style,
    }}>
      {(title || section || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            {section && <div className="t-section" style={{ marginBottom: title ? 6 : 0 }}>{section}</div>}
            {title && <div className="t-h4">{title}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------- MetricCard -------------------------------------------- */
function MetricCard({ label, value, unit, delta, deltaTone = "ok", sparkColor = "var(--accent)", sparkPoints }) {
  const points = sparkPoints || "0,28 20,26 40,24 60,22 80,18 100,16 120,14 140,12 160,10 180,8 200,6";
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6,
      padding: "14px 16px", position: "relative", overflow: "hidden", minHeight: 100,
    }}>
      <div style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 28, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: "var(--fg-1)" }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{unit}</span>}
      </div>
      {delta && (
        <div style={{ marginTop: 6, fontSize: 11, fontFamily: "var(--font-mono)", color: `var(--status-${deltaTone})` }}>{delta}</div>
      )}
      <svg viewBox="0 0 200 36" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, width: "100%" }}>
        <polyline fill="none" stroke={sparkColor} strokeWidth="1.5" points={points}/>
      </svg>
    </div>
  );
}

/* ---------- Input ------------------------------------------------- */
function Input({ value, onChange, placeholder, mono, error, iconLeft, type = "text", style = {} }) {
  return (
    <div style={{ position: "relative", ...style }}>
      {iconLeft && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)" }}><Icon name={iconLeft} size={14}/></span>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{
        width: "100%", height: 32, padding: iconLeft ? "0 10px 0 32px" : "0 10px",
        background: "var(--bg-input)", border: `1px solid ${error ? "var(--crit-border)" : "var(--border-2)"}`,
        borderRadius: 4, color: "var(--fg-1)", fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: mono ? 12 : 13, outline: "none",
      }}/>
    </div>
  );
}

/* ---------- Table ------------------------------------------------- */
function Table({ columns, rows, onRowClick, selectedKey, getRowKey }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={{
                textAlign: c.align || "left", fontWeight: 600, fontSize: 10,
                letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)",
                padding: "8px 14px", background: "var(--ink-150)",
                borderBottom: "1px solid var(--border-2)", whiteSpace: "nowrap",
                width: c.width,
              }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => {
            const k = getRowKey ? getRowKey(r) : ri;
            const isSel = selectedKey != null && selectedKey === k;
            return (
              <tr key={k}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  style={{ background: isSel ? "var(--accent-soft)" : "transparent", cursor: onRowClick ? "pointer" : "default" }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                {columns.map((c, ci) => (
                  <td key={ci} style={{
                    padding: "9px 14px", borderBottom: ri === rows.length - 1 ? 0 : "1px solid var(--border-1)",
                    color: "var(--fg-1)", fontFamily: c.mono ? "var(--font-mono)" : "var(--font-sans)",
                    fontSize: c.mono ? 12 : 12, textAlign: c.align || "left",
                    fontVariantNumeric: c.align === "right" ? "tabular-nums" : undefined,
                    whiteSpace: c.nowrap ? "nowrap" : undefined,
                  }}>{c.cell(r)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Empty state ------------------------------------------- */
function EmptyState({ icon = "check", title, description, action }) {
  return (
    <div style={{ padding: 48, textAlign: "center", color: "var(--fg-2)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 999, background: "var(--bg-surface)", border: "1px solid var(--border-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, color: "var(--fg-3)" }}>
        <Icon name={icon} size={22}/>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-1)" }}>{title}</div>
      {description && <div style={{ fontSize: 13, marginTop: 6 }}>{description}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/* ---------- Pulse CSS (injected once) ----------------------------- */
if (!document.getElementById("luch-pulse-style")) {
  const s = document.createElement("style"); s.id = "luch-pulse-style";
  s.textContent = `
    @keyframes luchPulse { 0%,100%{transform:scale(1);opacity:0.55} 50%{transform:scale(2.4);opacity:0} }
    .sd-live::after { content:""; position:absolute; inset:0; border-radius:999px; background:inherit; animation: luchPulse 1.6s var(--ease-out) infinite; }
  `;
  document.head.appendChild(s);
}

/* Export everything to window so other JSX scripts can use them */
Object.assign(window, { Icon, Button, Badge, StatusDot, Card, MetricCard, Input, Table, EmptyState, useState, useMemo, useEffect, useRef });

/* ---------- Language ---------------------------------------------- */
const LangContext = React.createContext({ lang: "ru", setLang: () => {} });
function LangProvider({ children, initial = "ru" }) {
  const stored = (typeof localStorage !== "undefined" && localStorage.getItem("luch-lang")) || initial;
  const [lang, setLangState] = React.useState(stored);
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem("luch-lang", l); } catch (e) {}
    document.documentElement.lang = l;
  };
  React.useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}
/** useT() returns a translator function: t(en, ru) → string in the active locale. */
function useT() {
  const { lang } = React.useContext(LangContext);
  return (en, ru) => (lang === "ru" ? ru : en);
}
function useLang() { return React.useContext(LangContext); }

Object.assign(window, { LangContext, LangProvider, useT, useLang });
