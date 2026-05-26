/* TK-Luch · Admin settings */

function Admin() {
  const t = useT();
  const [tab, setTab] = React.useState("probes");
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div className="t-section">{t("Administration", "Администрирование")}</div>
        <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>{t("Settings", "Настройки")}</div>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <aside style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { k: "probes",       l: t("Probes",        "Зонды"),           ic: "activity" },
            { k: "agents",       l: t("Agents",        "Агенты"),          ic: "cpu"      },
            { k: "users",        l: t("Users",         "Пользователи"),    ic: "user"     },
            { k: "rules",        l: t("Alert rules",   "Правила алертов"), ic: "triangle" },
            { k: "integrations", l: t("Integrations",  "Интеграции"),      ic: "globe"    },
            { k: "retention",    l: t("Retention",     "Хранение"),        ic: "database" },
            { k: "audit",        l: t("Audit log",     "Журнал аудита"),   ic: "eye"      },
          ].map(it => (
            <div key={it.k} onClick={() => setTab(it.k)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
              borderRadius: 5, fontSize: 13, cursor: "pointer",
              color: tab === it.k ? "var(--fg-1)" : "var(--fg-2)",
              background: tab === it.k ? "var(--bg-hover)" : "transparent",
            }}>
              <Icon name={it.ic} size={15}/>
              <span>{it.l}</span>
            </div>
          ))}
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {tab === "probes" && <ProbesSettings/>}
          {tab === "agents" && <AgentsSettings/>}
          {tab === "users"  && <UsersSettings/>}
          {tab !== "probes" && tab !== "agents" && tab !== "users" && (
            <Card>
              <EmptyState icon="settings" title={t("Coming soon", "Скоро")} description={t("This admin section is not yet implemented in the design kit.", "Этот раздел админа ещё не реализован в дизайн-ките.")}/>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ProbesSettings() {
  const t = useT();
  return (
    <>
      <Card section={t("Probe defaults", "Настройки по умолчанию")} title={t("Default probe configuration", "Конфигурация зондов")}
            action={<Button variant="primary">{t("Save changes", "Сохранить")}</Button>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("ICMP timeout", "Таймаут ICMP")}</label>
            <Input value="5000 ms" mono/>
            <div className="t-meta" style={{ marginTop: 4 }}>{t("Time before a probe is considered failed.", "Время до признания пробы неуспешной.")}</div>
          </div>
          <div>
            <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("Probe interval", "Интервал проб")}</label>
            <Input value="30 s" mono/>
            <div className="t-meta" style={{ marginTop: 4 }}>{t("How often agents probe each host.", "Как часто агенты опрашивают каждый хост.")}</div>
          </div>
          <div>
            <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("Failure threshold", "Порог отказа")}</label>
            <Input value={t("3 consecutive", "3 подряд")} mono/>
          </div>
          <div>
            <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("Alert delay", "Задержка алерта")}</label>
            <Input value="60 s" mono/>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: 12, background: "var(--info-bg)", border: "1px solid var(--info-border)", borderRadius: 6, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="message" size={16} style={{ color: "var(--status-info)", flex: "0 0 16px", marginTop: 1 }}/>
          <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{t("Changes take effect on all agents within 2 minutes. Active alerts will not be re-evaluated.", "Изменения вступят в силу для всех агентов в течение 2 минут. Активные алерты не будут переоценены.")}</div>
        </div>
      </Card>

      <Card section={t("Active probes", "Активные зонды")} title={t("14 enabled · 2 disabled", "14 включено · 2 отключено")}
            action={<Button iconLeft="plus" variant="primary">{t("Add probe", "Добавить зонд")}</Button>}>
        <Table
          getRowKey={r => r.name}
          columns={[
            { header: "", width: 36, cell: r => <StatusDot status={r.status}/> },
            { header: t("Name",     "Название"), mono: true, cell: r => r.name },
            { header: t("Type",     "Тип"),      width: 90, cell: r => <Badge status="info" pill>{r.type}</Badge> },
            { header: t("Targets",  "Цели"),     mono: true, width: 80, align: "right", cell: r => r.targets },
            { header: t("Interval", "Интервал"), mono: true, width: 80, align: "right", cell: r => r.interval },
            { header: t("Last run", "Запуск"),   mono: true, width: 110, cell: r => <span style={{ color: "var(--fg-3)" }}>{useT()(r.last.en, r.last.ru)}</span> },
            { header: "", width: 40, cell: () => <Icon name="settings" size={14} style={{ color: "var(--fg-3)" }}/> },
          ]}
          rows={[
            { name: "icmp.all-hosts", type: "ICMP", targets: 421, interval: "30 s",  last: { en: "2m ago",  ru: "2 м назад"  }, status: "ok" },
            { name: "tcp.db-cluster", type: "TCP",  targets: 12,  interval: "15 s",  last: { en: "12s ago", ru: "12 с назад" }, status: "ok" },
            { name: "http.public",    type: "HTTP", targets: 8,   interval: "60 s",  last: { en: "32s ago", ru: "32 с назад" }, status: "warn" },
            { name: "dns.internal",   type: "DNS",  targets: 4,   interval: "60 s",  last: { en: "44s ago", ru: "44 с назад" }, status: "ok" },
            { name: "snmp.routers",   type: "SNMP", targets: 22,  interval: "120 s", last: { en: "1m ago",  ru: "1 м назад"  }, status: "ok" },
            { name: "tcp.legacy-edi", type: "TCP",  targets: 2,   interval: "30 s",  last: { en: "—",       ru: "—"          }, status: "muted" },
          ]}
        />
      </Card>
    </>
  );
}

function AgentsSettings() {
  const t = useT();
  return (
    <Card section={t("Agents", "Агенты")} title={t("412 connected · 3 offline", "412 на связи · 3 офлайн")}
          action={<Button iconLeft="download">{t("Download agent", "Скачать агент")}</Button>}>
      <Table
        getRowKey={r => r.name}
        columns={[
          { header: "", width: 36, cell: r => <StatusDot status={r.status} live={r.status === "ok"}/> },
          { header: t("Agent", "Агент"), mono: true, cell: r => r.name },
          { header: t("Version", "Версия"), mono: true, width: 80, cell: r => <span style={{ color: "var(--fg-3)" }}>{r.ver}</span> },
          { header: t("Depot",   "Депо"),    mono: true, width: 50, cell: r => <span style={{ color: "var(--fg-3)" }}>{r.depot}</span> },
          { header: t("Probes",  "Зонды"),   mono: true, width: 80, align: "right", cell: r => r.probes },
          { header: t("Lag",     "Лаг"),     mono: true, width: 80, align: "right", cell: r => r.lag },
          { header: t("Last seen", "Был на связи"), width: 130, mono: true, cell: r => <span style={{ color: r.status === "crit" ? "var(--status-crit)" : "var(--fg-3)" }}>{useT()(r.seen.en, r.seen.ru)}</span> },
        ]}
        rows={[
          { name: "agent-msk-01", ver: "2.4.1", depot: "МСК", probes: 142, lag: "82 ms",  seen: { en: "now",      ru: "сейчас"      }, status: "ok"   },
          { name: "agent-msk-02", ver: "2.4.1", depot: "МСК", probes: 138, lag: "76 ms",  seen: { en: "now",      ru: "сейчас"      }, status: "ok"   },
          { name: "agent-spb-01", ver: "2.4.1", depot: "СПБ", probes: 96,  lag: "104 ms", seen: { en: "now",      ru: "сейчас"      }, status: "ok"   },
          { name: "agent-spb-02", ver: "2.4.0", depot: "СПБ", probes: 88,  lag: "182 ms", seen: { en: "12s ago",  ru: "12 с назад"  }, status: "ok" },
          { name: "agent-nsk-01", ver: "2.4.1", depot: "НСК", probes: 78,  lag: "228 ms", seen: { en: "now",      ru: "сейчас"      }, status: "ok"   },
          { name: "agent-ekb-01", ver: "2.3.8", depot: "ЕКБ", probes: 64,  lag: "—",      seen: { en: "8m ago",   ru: "8 м назад"   }, status: "crit" },
        ]}
      />
    </Card>
  );
}

function UsersSettings() {
  const t = useT();
  return (
    <Card section={t("Team", "Команда")} title={t("6 active members", "6 активных участников")}
          action={<Button variant="primary" iconLeft="plus">{t("Invite", "Пригласить")}</Button>}>
      <Table
        getRowKey={r => r.email}
        columns={[
          { header: t("User", "Пользователь"), cell: r => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: 4, background: r.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>{r.initials}</span>
              <div>
                <div style={{ color: "var(--fg-1)" }}>{r.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>{r.email}</div>
              </div>
            </div>
          )},
          { header: t("Role", "Роль"), width: 130, cell: r => <Badge status={r.role === "admin" ? "gold" : "info"} pill>{t(r.role === "admin" ? "Admin" : r.role === "engineer" ? "Engineer" : "Viewer", r.role === "admin" ? "Админ" : r.role === "engineer" ? "Инженер" : "Зритель")}</Badge> },
          { header: t("Depot", "Депо"), mono: true, width: 80, cell: r => <span style={{ color: "var(--fg-3)" }}>{r.depot}</span> },
          { header: t("Last active", "Активность"), width: 130, mono: true, cell: r => <span style={{ color: "var(--fg-3)" }}>{useT()(r.last.en, r.last.ru)}</span> },
          { header: t("Status", "Статус"), width: 90, cell: r => <Badge status={r.active ? "ok" : "muted"}>{r.active ? t("Active", "Активен") : t("Invited", "Приглашён")}</Badge> },
        ]}
        rows={[
          { name: "Дмитрий Кузнецов", email: "d.kuznetsov@tk-luch.ru", initials: "ДК", role: "admin",    depot: "МСК", last: { en: "now",      ru: "сейчас"    }, active: true,  color: "var(--accent)" },
          { name: "Андрей Петров",    email: "a.petrov@tk-luch.ru",    initials: "АП", role: "engineer", depot: "МСК", last: { en: "8m ago",   ru: "8 м назад" }, active: true,  color: "var(--chart-6)" },
          { name: "Мария Соколова",   email: "m.sokolova@tk-luch.ru",  initials: "МС", role: "engineer", depot: "СПБ", last: { en: "1h ago",   ru: "1 ч назад" }, active: true,  color: "var(--chart-7)" },
          { name: "Игорь Волков",     email: "i.volkov@tk-luch.ru",    initials: "ИВ", role: "engineer", depot: "ЕКБ", last: { en: "2h ago",   ru: "2 ч назад" }, active: true,  color: "var(--chart-3)" },
          { name: "Анна Лебедева",    email: "a.lebedeva@tk-luch.ru",  initials: "АЛ", role: "viewer",   depot: "НСК", last: { en: "1d ago",   ru: "1 д назад" }, active: true,  color: "var(--chart-4)" },
          { name: "Сергей Морозов",   email: "s.morozov@tk-luch.ru",   initials: "СМ", role: "engineer", depot: "МСК", last: { en: "—",        ru: "—"         }, active: false, color: "var(--ink-500)" },
        ]}
      />
    </Card>
  );
}

Object.assign(window, { Admin });
