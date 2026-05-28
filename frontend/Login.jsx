/* TK-Luch · Login screen — language-aware, fully branded */

function Login({ onSignIn }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const [user, setUser] = React.useState("e.mohammad");
  const [pwd, setPwd] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const submit = async (e) => {
    e?.preventDefault();
    if (!user || !pwd) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.trim(), password: pwd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(t(data.detail || "Invalid credentials", data.detail || "Неверный логин или пароль"));
        setBusy(false);
        return;
      }
      const data = await res.json();
      if (data.token) setAuthToken(data.token);
      onSignIn({ ...data, username: user.trim() });
    } catch (err) {
      setError(t("Server unreachable", "Сервер недоступен"));
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--bg-app)", overflow: "hidden" }}>
      {/* Left — visual brand panel */}
      <div style={{ flex: "1 1 55%", position: "relative", overflow: "hidden", background: "var(--ink-000)" }}>
        <img src="../../assets/illustration-fleet.png" alt=""
             style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", filter: "brightness(0.55) saturate(1.15)" }}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,15,26,0.4) 0%, rgba(10,15,26,0.85) 100%)" }}/>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, var(--brand-red) 0%, var(--brand-red-deep) 35%, var(--brand-gold) 100%)" }}/>

        <div style={{ position: "absolute", top: 36, left: 36, display: "flex", alignItems: "center", gap: 14 }}>
          <img src="../../assets/brand-logo.svg" alt={lang === "ru" ? "ТК Луч" : "TK Luch"} style={{ height: 56, display: "block" }}/>
        </div>

        <div style={{ position: "absolute", left: 36, bottom: 40, right: 36, color: "#fff" }}>
          <div className="t-section" style={{ color: "var(--brand-gold)", marginBottom: 16, letterSpacing: "0.12em" }}>
            {t("TK-Luch · Infrastructure monitoring", "ТК-Луч · Мониторинг инфраструктуры")}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 52, lineHeight: 1.05, letterSpacing: "-0.02em", color: "#fff", maxWidth: 560 }}>
            {t(<>Every probe<br/>accounted for.</>, <>Каждый зонд<br/>на&nbsp;учёте.</>)}
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-700)", marginTop: 14, maxWidth: 480, lineHeight: 1.5 }}>
            {t(
              "The state of servers, network and services across our Moscow, St Petersburg, Novosibirsk and Yekaterinburg depots — in a single pane.",
              "Состояние серверов, сети и сервисов в депо Москвы, Петербурга, Новосибирска и Екатеринбурга — в одном окне."
            )}
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 18, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-600)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            <div><span style={{ color: "var(--ok-400)" }}>● </span>421 {t("hosts", "хостов")}</div>
            <div><span style={{ color: "var(--warn-400)" }}>● </span>3 {t("degraded", "деградация")}</div>
            <div><span style={{ color: "var(--ok-400)" }}>● </span>{lang === "ru" ? "99,97" : "99.97"} % {t("uptime", "доступность")}</div>
          </div>
        </div>
      </div>

      {/* Right — sign-in form */}
      <div style={{
        flex: "0 0 480px", display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px 56px", background: "var(--bg-chrome)", borderLeft: "1px solid var(--border-2)",
        position: "relative",
      }}>
        {/* language switch (top-right of form panel) */}
        <div style={{ position: "absolute", top: 24, right: 24, display: "inline-flex", background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 4, padding: 2 }} role="group" aria-label="Language">
          {["en", "ru"].map(l => (
            <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} style={{
              background: lang === l ? "var(--accent-soft)" : "transparent",
              color: lang === l ? "var(--accent)" : "var(--fg-3)",
              border: 0, borderRadius: 3, padding: "4px 10px",
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
              cursor: "pointer", textTransform: "uppercase",
            }}>{l}</button>
          ))}
        </div>

        <div className="t-section" style={{ marginBottom: 8 }}>{t("Sign in", "Вход")}</div>
        <div className="t-h2" style={{ fontSize: 28, marginBottom: 6 }}>{t("Welcome back", "С возвращением")}</div>
        <div className="t-body-sm" style={{ color: "var(--fg-2)", marginBottom: 28 }}>{t("Use corporate SSO or your TK-Luch credentials.", "Используйте корпоративный SSO или логин TK-Луч.")}</div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("Username", "Логин")}</label>
            <Input value={user} onChange={e => setUser(e.target.value)} placeholder="e.g. e.mohammad" mono iconLeft="user"/>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label className="t-label">{t("Password", "Пароль")}</label>
            </div>
            <Input value={pwd} onChange={e => setPwd(e.target.value)} type="password" placeholder={t("Enter your password", "Введите пароль")} mono/>
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-2)" }}>
            <input type="checkbox" defaultChecked style={{ accentColor: "var(--accent)" }}/>
            {t("Remember this device for 30 days", "Запомнить устройство на 30 дней")}
          </label>
          {error && (
            <div style={{ padding: "8px 12px", background: "var(--crit-bg)", border: "1px solid var(--crit-border)", borderRadius: 4, fontSize: 12, color: "var(--status-crit)" }}>
              {error}
            </div>
          )}
          <Button variant="brand" size="lg" type="submit" disabled={busy || !user || !pwd} style={{ marginTop: 6, width: "100%", justifyContent: "center" }}>
            {busy ? t("Signing in…", "Вход…") : t("Sign in", "Войти")}
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0", color: "var(--fg-3)", fontSize: 11 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-2)" }}/>
            <span>{t("or", "или")}</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-2)" }}/>
          </div>
          <Button variant="secondary" size="lg" onClick={submit} style={{ width: "100%", justifyContent: "center" }}>
            {t("Single Sign-On (Active Directory)", "Единый вход (Active Directory)")}
          </Button>
        </form>

        <div style={{ marginTop: "auto", paddingTop: 36, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", display: "flex", justifyContent: "space-between" }}>
          <span>TK-Luch © 2026</span>
          <span>luch.local · 10.42.0.1</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Login });
