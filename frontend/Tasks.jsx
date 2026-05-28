/* TK-Luch · Tasks & Topics — superadmin only */

const STATES = [
  { key: "open",     label: { en: "Open",    ru: "Открытые" },     color: "var(--status-ok)" },
  { key: "on_hold",  label: { en: "On Hold", ru: "На паузе" },     color: "var(--status-warn)" },
  { key: "pending",  label: { en: "Pending", ru: "Ожидание" },     color: "var(--status-info)" },
  { key: "solved",   label: { en: "Solved",  ru: "Решённые" },     color: "var(--fg-3)" },
];

const PRIO_COLOR = { high: "var(--status-crit)", medium: "var(--status-warn)", low: "var(--fg-3)" };
const PRIO_LABEL = { high: { en: "High", ru: "Высокий" }, medium: { en: "Med", ru: "Средний" }, low: { en: "Low", ru: "Низкий" } };

function fmtRelative(ts) {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Tasks() {
  const t = useT();
  const { lang } = useLang();
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState("board"); // "board" | "list"
  const [showNew, setShowNew] = React.useState(false);
  const [editTask, setEditTask] = React.useState(null);

  const load = async () => {
    try {
      const r = await fetch("/api/tasks");
      if (r.ok) setTasks(await r.json());
    } catch (e) {
      console.error("tasks load:", e);
    }
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const updateState = async (id, state) => {
    const r = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (r.ok) setTasks(prev => prev.map(t => t.id === id ? { ...t, state } : t));
  };

  const deleteTask = async (id) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const counts = Object.fromEntries(STATES.map(s => [s.key, tasks.filter(t => t.state === s.key).length]));
  const openCount = counts.open + counts.on_hold + counts.pending;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="t-section">{t("Private", "Личное")}</div>
          <div className="t-h2" style={{ fontSize: 26, marginTop: 4 }}>
            {t("Tasks & Topics", "Задачи и темы")}
            {openCount > 0 && (
              <span style={{ marginLeft: 12, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--status-warn)", fontWeight: 400 }}>
                {openCount} {t("open", "открытых")}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "inline-flex", background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 4, padding: 2 }}>
            {["board", "list"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? "var(--accent-soft)" : "transparent",
                color: view === v ? "var(--accent)" : "var(--fg-3)",
                border: 0, borderRadius: 3, padding: "4px 10px",
                fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
              }}>{v === "board" ? t("Board", "Доска") : t("List", "Список")}</button>
            ))}
          </div>
          <Button variant="primary" iconLeft="plus" onClick={() => setShowNew(true)}>
            {t("New task", "Новая задача")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{t("Loading…", "Загрузка…")}</div>
      ) : view === "board" ? (
        <TaskBoard tasks={tasks} lang={lang} onStateChange={updateState} onDelete={deleteTask} onEdit={setEditTask} t={t}/>
      ) : (
        <TaskList tasks={tasks} lang={lang} onStateChange={updateState} onDelete={deleteTask} onEdit={setEditTask} t={t}/>
      )}

      {(showNew || editTask) && (
        <TaskModal
          task={editTask}
          lang={lang}
          t={t}
          onSave={async (data) => {
            if (editTask) {
              const r = await fetch(`/api/tasks/${editTask.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (r.ok) {
                const updated = await r.json();
                setTasks(prev => prev.map(t => t.id === editTask.id ? updated : t));
              }
            } else {
              const r = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (r.ok) setTasks(prev => [...prev, await r.json()]);
            }
            setShowNew(false);
            setEditTask(null);
          }}
          onClose={() => { setShowNew(false); setEditTask(null); }}
        />
      )}
    </div>
  );
}

function TaskBoard({ tasks, lang, onStateChange, onDelete, onEdit, t }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {STATES.map(s => {
        const col = tasks.filter(task => task.state === s.key);
        return (
          <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6, borderBottom: `2px solid ${s.color}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{lang === "ru" ? s.label.ru : s.label.en}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", marginLeft: "auto" }}>{col.length}</span>
            </div>
            {col.map(task => (
              <TaskCard key={task.id} task={task} lang={lang} onStateChange={onStateChange} onDelete={onDelete} onEdit={onEdit} t={t}/>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task, lang, onStateChange, onDelete, onEdit, t }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const prioColor = PRIO_COLOR[task.priority] || "var(--fg-3)";
  const prioLabel = PRIO_LABEL[task.priority] || PRIO_LABEL.medium;

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6,
      padding: "10px 12px", position: "relative",
      borderLeft: `3px solid ${prioColor}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", lineHeight: 1.3, flex: 1 }}>{task.title}</div>
        <button onClick={() => setMenuOpen(o => !o)} style={{ background: "transparent", border: 0, color: "var(--fg-3)", cursor: "pointer", padding: 0, flex: "0 0 16px" }}>
          <Icon name="settings" size={13}/>
        </button>
      </div>
      {task.description && (
        <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.description}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: prioColor, background: `${prioColor}22`, padding: "1px 6px", borderRadius: 3 }}>
          {lang === "ru" ? prioLabel.ru : prioLabel.en}
        </span>
        {(task.tags || []).map(tag => (
          <span key={tag} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 3 }}>
            {tag}
          </span>
        ))}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", marginLeft: "auto" }}>
          #{task.id} · {fmtRelative(task.created_at)}
        </span>
      </div>

      {menuOpen && (
        <div style={{ position: "absolute", top: 32, right: 8, background: "var(--bg-raised)", border: "1px solid var(--border-2)", borderRadius: 4, boxShadow: "var(--shadow-2)", padding: 4, minWidth: 140, zIndex: 10 }}>
          <div onClick={() => { onEdit(task); setMenuOpen(false); }} style={{ padding: "6px 10px", fontSize: 12, color: "var(--fg-1)", cursor: "pointer", borderRadius: 3 }}>{t("Edit", "Изменить")}</div>
          <div style={{ padding: "4px 10px 2px", fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Move to", "Переместить в")}</div>
          {STATES.filter(s => s.key !== task.state).map(s => (
            <div key={s.key} onClick={() => { onStateChange(task.id, s.key); setMenuOpen(false); }} style={{ padding: "6px 10px", fontSize: 12, color: s.color, cursor: "pointer", borderRadius: 3 }}>
              {lang === "ru" ? s.label.ru : s.label.en}
            </div>
          ))}
          <div style={{ height: 1, background: "var(--border-1)", margin: "4px 0" }}/>
          <div onClick={() => { onDelete(task.id); setMenuOpen(false); }} style={{ padding: "6px 10px", fontSize: 12, color: "var(--status-crit)", cursor: "pointer", borderRadius: 3 }}>{t("Delete", "Удалить")}</div>
        </div>
      )}
    </div>
  );
}

function TaskList({ tasks, lang, onStateChange, onDelete, onEdit, t }) {
  const [filterState, setFilterState] = React.useState("all");
  const visible = filterState === "all" ? tasks : tasks.filter(t => t.state === filterState);
  const sorted = [...visible].sort((a, b) => {
    const stateOrd = { open: 0, on_hold: 1, pending: 2, solved: 3 };
    const prioOrd  = { high: 0, medium: 1, low: 2 };
    return (stateOrd[a.state] ?? 0) - (stateOrd[b.state] ?? 0) || (prioOrd[a.priority] ?? 1) - (prioOrd[b.priority] ?? 1);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setFilterState("all")} style={{
          padding: "4px 10px", borderRadius: 999, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-mono)",
          background: filterState === "all" ? "var(--accent-soft)" : "var(--bg-surface)",
          border: `1px solid ${filterState === "all" ? "var(--info-border)" : "var(--border-2)"}`,
          color: filterState === "all" ? "var(--accent)" : "var(--fg-2)",
        }}>{t("All", "Все")} ({tasks.length})</button>
        {STATES.map(s => (
          <button key={s.key} onClick={() => setFilterState(s.key)} style={{
            padding: "4px 10px", borderRadius: 999, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-mono)",
            background: filterState === s.key ? `${s.color}22` : "var(--bg-surface)",
            border: `1px solid ${filterState === s.key ? s.color : "var(--border-2)"}`,
            color: filterState === s.key ? s.color : "var(--fg-2)",
          }}>{lang === "ru" ? s.label.ru : s.label.en} ({tasks.filter(t => t.state === s.key).length})</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.length === 0
          ? <EmptyState icon="check" title={t("No tasks", "Нет задач")} description={t("All clear!", "Всё чисто!")}/>
          : sorted.map(task => {
            const s = STATES.find(s => s.key === task.state) || STATES[0];
            const prioColor = PRIO_COLOR[task.priority] || "var(--fg-3)";
            const prioLabel = PRIO_LABEL[task.priority] || PRIO_LABEL.medium;
            return (
              <div key={task.id} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px",
                background: "var(--bg-surface)", border: "1px solid var(--border-2)", borderRadius: 6,
                borderLeft: `3px solid ${prioColor}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{task.title}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>#{task.id}</span>
                  </div>
                  {task.description && <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{task.description}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: prioColor }}>{lang === "ru" ? prioLabel.ru : prioLabel.en}</span>
                  <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{lang === "ru" ? s.label.ru : s.label.en}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>{fmtRelative(task.created_at)}</span>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(task)}><Icon name="settings" size={12}/></Button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function TaskModal({ task, lang, t, onSave, onClose }) {
  const [title, setTitle] = React.useState(task?.title || "");
  const [desc, setDesc] = React.useState(task?.description || "");
  const [state, setState] = React.useState(task?.state || "open");
  const [priority, setPriority] = React.useState(task?.priority || "medium");
  const [tags, setTags] = React.useState((task?.tags || []).join(", "));
  const [saving, setSaving] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: desc.trim(),
      state,
      priority,
      tags: tags.split(",").map(s => s.trim()).filter(Boolean),
    });
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-chrome)", border: "1px solid var(--border-2)", borderRadius: 8, padding: 24, width: 480, boxShadow: "var(--shadow-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="t-h4">{task ? t("Edit task", "Изменить задачу") : t("New task", "Новая задача")}</div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "var(--fg-3)", cursor: "pointer" }}><Icon name="x" size={16}/></button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("Title", "Заголовок")} *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("What needs to be done?", "Что нужно сделать?")}/>
          </div>
          <div>
            <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("Description", "Описание")}</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{
              width: "100%", padding: "8px 10px", background: "var(--bg-input)", border: "1px solid var(--border-2)",
              borderRadius: 4, color: "var(--fg-1)", fontSize: 13, resize: "vertical", fontFamily: "var(--font-sans)",
            }}/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("State", "Статус")}</label>
              <select value={state} onChange={e => setState(e.target.value)} style={{
                width: "100%", height: 32, padding: "0 8px", background: "var(--bg-input)", border: "1px solid var(--border-2)",
                borderRadius: 4, color: "var(--fg-1)", fontSize: 12,
              }}>
                {STATES.map(s => <option key={s.key} value={s.key}>{lang === "ru" ? s.label.ru : s.label.en}</option>)}
              </select>
            </div>
            <div>
              <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("Priority", "Приоритет")}</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{
                width: "100%", height: 32, padding: "0 8px", background: "var(--bg-input)", border: "1px solid var(--border-2)",
                borderRadius: 4, color: "var(--fg-1)", fontSize: 12,
              }}>
                <option value="high">{t("High", "Высокий")}</option>
                <option value="medium">{t("Medium", "Средний")}</option>
                <option value="low">{t("Low", "Низкий")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="t-label" style={{ display: "block", marginBottom: 6 }}>{t("Tags (comma separated)", "Теги (через запятую)")}</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="vpn, branch, urgent" mono/>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <Button onClick={onClose}>{t("Cancel", "Отмена")}</Button>
            <Button variant="primary" type="submit" disabled={saving || !title.trim()}>
              {saving ? t("Saving…", "Сохранение…") : t("Save", "Сохранить")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { Tasks });
