/* TK-Luch · App root */

const UserContext = React.createContext(null);
function useUser() { return React.useContext(UserContext); }

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
root.render(<App/>);

Object.assign(window, { useUser, UserContext });
