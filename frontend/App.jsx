/* TK-Luch · App root */

const UserContext = React.createContext(null);
function useUser() { return React.useContext(UserContext); }

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error("[App] render error:", err, info); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: "monospace", background: "#0a0f1a", color: "#ff6b6b", height: "100vh", overflow: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>App crashed — check browser console (F12)</div>
        <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "#ff6b6b" }}>{String(this.state.error)}</pre>
        <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", color: "#6b7a99", marginTop: 12 }}>{this.state.error?.stack || ""}</pre>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 20, padding: "8px 16px", background: "#1a2335", border: "1px solid #2f3c57", color: "#c7d1e3", borderRadius: 4, cursor: "pointer" }}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = React.useState(null);
  const [page, setPage] = React.useState("dashboard");

  return (
    <DataProvider>
      <LangProvider initial="ru">
        {user
          ? <UserContext.Provider value={user}>
              <AppAuth user={user} setUser={setUser} page={page} setPage={setPage}/>
            </UserContext.Provider>
          : <Login onSignIn={u => setUser(u)}/>}
      </LangProvider>
    </DataProvider>
  );
}

function AppAuth({ user, setUser, page, setPage }) {
  const t = useT();
  const { data } = useData();
  const sum = data?.summary ?? {};
  const alertCount = (sum.alerts_crit ?? 0) + (sum.alerts_warn ?? 0);

  const role = user.role || "viewer";
  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperAdmin = role === "superadmin";

  const nav = [
    {
      label: t("Observability", "Наблюдаемость"),
      items: [
        { key: "dashboard", icon: "layout",  label: t("Dashboard", "Дашборд") },
        ...(isAdmin ? [
          { key: "alerts", icon: "triangle", label: t("Alerts", "Алерты"),
            count: alertCount || null, countTone: sum.alerts_crit > 0 ? "crit" : "warn" },
          { key: "logs",   icon: "message",  label: t("Logs", "Логи") },
        ] : []),
      ],
    },
    {
      label: t("Inventory", "Учёт"),
      items: [
        ...(isAdmin ? [
          { key: "inventory", icon: "server", label: t("Hosts", "Хосты"),
            count: sum.branches_total || null },
        ] : []),
        { key: "topology", icon: "globe", label: t("Topology", "Топология") },
      ],
    },
    ...(isAdmin ? [{
      label: t("Administration", "Администрирование"),
      items: [
        { key: "admin", icon: "settings", label: t("Admin", "Админ") },
      ],
    }] : []),
    ...(isSuperAdmin ? [{
      label: t("Private", "Личное"),
      items: [
        { key: "tasks", icon: "activity", label: t("Tasks & Topics", "Задачи") },
      ],
    }] : []),
  ];

  const screens = {
    dashboard: <Dashboard/>,
    alerts:    isAdmin ? <Alerts/> : <Dashboard/>,
    inventory: isAdmin ? <Inventory/> : <Dashboard/>,
    logs:      isAdmin ? <Logs/> : <Dashboard/>,
    topology:  <Topology/>,
    admin:     isAdmin ? <Admin/> : <Dashboard/>,
    tasks:     isSuperAdmin ? <Tasks/> : <Dashboard/>,
  };

  return (
    <AppShell
      topbar={
        <Topbar
          envs={["prod · Luch"]}
          currentEnv="prod · Luch"
          setCurrentEnv={() => {}}
          alertCount={isAdmin ? alertCount : 0}
          user={user}
          onSignOut={() => { clearAuthToken(); setUser(null); }}
          data={data}
        />
      }
      sidebar={<Sidebar nav={nav} current={page} onNav={setPage}/>}
    >
      {screens[page] || screens.dashboard}
    </AppShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ErrorBoundary><App/></ErrorBoundary>);

Object.assign(window, { useUser, UserContext });
