/* TK-Luch · App root */

function App() {
  const [user, setUser] = React.useState(null);
  const [page, setPage] = React.useState("dashboard");

  return (
    <DataProvider>
      <LangProvider initial="ru">
        {user
          ? <AppAuth user={user} setUser={setUser} page={page} setPage={setPage}/>
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

  const nav = [
    {
      label: t("Observability", "Наблюдаемость"),
      items: [
        { key: "dashboard", icon: "layout",   label: t("Dashboard", "Дашборд") },
        { key: "alerts",    icon: "triangle",  label: t("Alerts", "Алерты"),
          count: alertCount || null, countTone: sum.alerts_crit > 0 ? "crit" : "warn" },
        { key: "logs",      icon: "message",   label: t("Logs", "Логи") },
      ],
    },
    {
      label: t("Inventory", "Учёт"),
      items: [
        { key: "inventory", icon: "server",    label: t("Hosts", "Хосты"),
          count: sum.branches_total || null },
        { key: "topology",  icon: "globe",     label: t("Topology", "Топология") },
      ],
    },
    {
      label: t("Administration", "Администрирование"),
      items: [
        { key: "admin",     icon: "settings",  label: t("Admin", "Админ") },
      ],
    },
  ];

  const screens = {
    dashboard: <Dashboard/>,
    alerts:    <Alerts/>,
    inventory: <Inventory/>,
    logs:      <Logs/>,
    topology:  <Topology/>,
    admin:     <Admin/>,
  };

  return (
    <AppShell
      topbar={
        <Topbar
          envs={["prod · Luch", "prod · OTR-IT"]}
          currentEnv="prod · Luch"
          setCurrentEnv={() => {}}
          alertCount={alertCount}
          user={user}
          onSignOut={() => setUser(null)}
        />
      }
      sidebar={<Sidebar nav={nav} current={page} onNav={setPage}/>}
    >
      {screens[page]}
    </AppShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
