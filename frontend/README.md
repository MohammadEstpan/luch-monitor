# Monitoring UI Kit

Interactive click-through of the **TK-Luch** internal infrastructure
monitoring product. Built as a React prototype using Babel-in-browser so it
runs as a single static HTML file with no build step.

## Open

Open `index.html` in a browser. You'll land on the **login screen** (the
fully branded, full-color moment). Sign in with any non-empty username +
password to enter the app shell.

## Screens

| Route key | File | Notes |
|---|---|---|
| `dashboard` | `Dashboard.jsx`  | Metric row, traffic chart, depot health, recent alerts, service SLOs. |
| `alerts`    | `Alerts.jsx`     | Filterable table + detail rail with timeline + linked alerts. |
| `inventory` | `Inventory.jsx`  | Tabbed host inventory with CPU/MEM/DISK bars, status dots. |
| `logs`      | `Logs.jsx`       | KQL-style query bar, histogram strip, dense log stream. |
| `topology`  | `Topology.jsx`   | Inter-depot SVG map with animated critical link + node hover. |
| `admin`     | `Admin.jsx`      | Settings — Probes, Agents, Users (others stubbed). |

## Components — `primitives.jsx`

- **`<Icon name={…} size={…} />`** — Lucide subset, stroke 1.75.
- **`<Button variant={primary|secondary|ghost|danger|brand|gold} size={sm|md|lg}>`** — full button family. `brand` is Луч-red, reserved for login + chrome.
- **`<Badge status={ok|warn|crit|info|muted|gold} solid pill>`** — status chips + filter pills.
- **`<StatusDot status live size>`** — pulsing dot for live state.
- **`<Card section title action raised status>`** — section-label cards.
- **`<MetricCard label value unit delta deltaTone sparkColor sparkPoints>`** — KPI tile with sparkline floor.
- **`<Input mono error iconLeft>`** — text input.
- **`<Table columns rows onRowClick selectedKey getRowKey>`** — dense data table with hover + selection.
- **`<EmptyState icon title description action>`** — empty/coming-soon panel.

## Shell — `Shell.jsx`

- **`<Topbar>`** — logo, environment switcher (popover), search box, alerts bell, user dropdown. Brand red→gold accent stripe along the bottom edge.
- **`<Sidebar>`** — sectioned nav with active rail + count chips.
- **`<AppShell>`** — top + side + main layout.

## Caveats

- All data is mocked inline in each screen file.
- Hostnames and `10.42.x.x` IPs are placeholders — user said real conventions
  will be provided later.
- Search box is decorative; ⌘K palette is not wired.
- Settings sections beyond Probes / Agents / Users render an empty state.
- Topology map is a fixed 5-node depot layout — not data-driven.
