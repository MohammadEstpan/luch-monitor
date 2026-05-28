/* Live data layer — WebSocket connection + DataContext */

const WS_URL = `ws://${location.host}/ws`;
const RECONNECT_MS = 5000;

/* Auth token helpers — used by all fetch() calls */
function getToken()           { try { return localStorage.getItem("luch-token") || ""; } catch { return ""; } }
function setAuthToken(t)      { try { localStorage.setItem("luch-token", t); } catch {} }
function clearAuthToken()     { try { localStorage.removeItem("luch-token"); } catch {} }
function authHeaders()        { const t = getToken(); return t ? { "Authorization": `Bearer ${t}` } : {}; }
function authFetch(url, opts) { return fetch(url, { ...opts, headers: { ...(opts?.headers || {}), ...authHeaders() } }); }

const DataContext = React.createContext(null);

function useData() {
  return React.useContext(DataContext);
}

function DataProvider({ children }) {
  const [data, setData] = React.useState(null);
  const [wsStatus, setWsStatus] = React.useState("connecting"); // connecting | open | closed
  const wsRef = React.useRef(null);

  React.useEffect(() => {
    let timer = null;

    function connect() {
      setWsStatus("connecting");
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus("open");

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "full") setData(msg);
        } catch (err) {
          console.error("ws parse error", err);
        }
      };

      ws.onclose = () => {
        setWsStatus("closed");
        timer = setTimeout(connect, RECONNECT_MS);
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      clearTimeout(timer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  function refresh() {
    authFetch("/api/refresh").catch(() => {});
  }

  return (
    <DataContext.Provider value={{ data, wsStatus, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

function WsStatusBadge() {
  const { wsStatus, refresh } = useData();
  const colors = { open: "var(--status-ok)", connecting: "var(--status-warn)", closed: "var(--status-crit)" };
  const labels = { open: "LIVE", connecting: "CONNECTING…", closed: "RECONNECTING…" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <StatusDot status={wsStatus === "open" ? "ok" : wsStatus === "connecting" ? "warn" : "crit"} live={wsStatus === "open"} size={7}/>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: colors[wsStatus] }}>{labels[wsStatus]}</span>
      <button
        onClick={refresh}
        title="Force refresh"
        style={{ background: "transparent", border: 0, color: "var(--fg-3)", cursor: "pointer", padding: "0 4px" }}
      >
        <Icon name="refresh" size={13}/>
      </button>
    </div>
  );
}

Object.assign(window, { DataProvider, useData, WsStatusBadge, DataContext, getToken, setAuthToken, clearAuthToken, authHeaders, authFetch });
