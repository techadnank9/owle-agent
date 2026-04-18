# ThinCloud Launcher UI Design

## Goal

Replace the current password-protected single-app client with a no-auth dashboard that shows live Mac Mini system stats, a configurable app grid, per-app CPU limit controls, and a full-screen stream view — all in one page with no reloads.

---

## What Changes

| File | Change |
|---|---|
| `src/server.js` | Remove all auth (POST /auth, JWT, token check on WS upgrade). Add GET /api/stats, GET /api/apps, POST /api/launch/:id, DELETE /api/session. Remove hardcoded launchChrome() on WS connect. |
| `src/launcher.js` | New file. Replaces chrome.js. Reads apps.json, spawns app by id, applies cpulimit after spawn, kills on stop. |
| `src/client/index.html` | Full redesign. Three states: Dashboard, Config panel, Stream. |
| `apps.json` | New file at repo root (deployed to Mac Mini). Defines app list. |
| `src/chrome.js` | Deleted — replaced by launcher.js. |
| `src/auth.js` | Deleted — no auth. |

**Unchanged:** `capture.js`, `webrtc.js`, `input.js`, `launchd/`, `scripts/`

---

## Architecture

### New REST Endpoints

```
GET  /              → serves index.html (dashboard)
GET  /api/stats     → { cpu: 42, memUsed: 4.2, memTotal: 8, diskUsed: 120, diskTotal: 460 }
GET  /api/apps      → [ { id, name, icon, defaultCpu }, ... ]
POST /api/launch/:id  body: { cpuLimit: 50 } → 200 OK or 409 if session active
DELETE /api/session → kills running app + stops capture
```

### apps.json Format

```json
[
  {
    "id": "chrome",
    "name": "Google Chrome",
    "icon": "🌐",
    "path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "defaultCpu": 50
  },
  {
    "id": "vscode",
    "name": "VS Code",
    "icon": "💻",
    "path": "/Applications/Visual Studio Code.app/Contents/MacOS/Electron",
    "defaultCpu": 40
  }
]
```

### launcher.js

- `launchApp(app, cpuLimit)` — spawns app at `app.path`, then runs `cpulimit -l <cpuLimit> -p <pid>` to apply soft CPU cap
- `killApp()` — SIGTERM to app process, kills cpulimit process
- `isRunning()` — returns bool

### Stats Collection

- **CPU%** — two `os.cpus()` samples 500ms apart, compute idle delta
- **Memory** — `os.totalmem()`, `os.freemem()`
- **Disk** — `child_process.execSync('df -k /')`, parse output

---

## Client UI — Three States

### State 1: Dashboard

```
┌─────────────────────────────────────────────┐
│  ThinCloud                                  │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ CPU  42% │  │ MEM 4/8GB│  │DISK120/460│  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────┐  ┌──────────┐                │
│  │ 🌐       │  │ 💻       │                │
│  │ Chrome   │  │ VS Code  │                │
│  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────┘
```

Stats refresh every 3 seconds via `GET /api/stats`.

### State 2: Config Panel (slide-in on app click)

```
┌─────────────────────────────┐
│  Google Chrome              │
│                             │
│  CPU Limit  [====|----] 50% │
│  Memory     4.2 GB free     │
│                             │
│  [  Launch  ]  [ Cancel ]   │
└─────────────────────────────┘
```

Slider range: 10–100%. Default from `apps.json defaultCpu`.

### State 3: Stream View

- Full-screen `<video>` element
- Thin overlay bar (top): app name, live CPU%, `⬅ Launcher` button
- `⬅ Launcher` → calls `DELETE /api/session` → returns to dashboard

---

## WebSocket / Signaling

- No token on WebSocket URL — `ws://host/signal` (no `?token=`)
- `server.js` upgrade handler removes JWT verify step
- Everything else (offer/answer/ICE/input) unchanged

---

## Session Lifecycle

```
Client clicks Launch
  → POST /api/launch/chrome { cpuLimit: 50 }
  → server: launchApp() → spawns Chrome → spawns cpulimit
  → client: opens WebSocket /signal
  → WebRTC offer/answer/ICE
  → capture.start() → stream begins

Client clicks ⬅ Launcher
  → DELETE /api/session
  → server: killApp() + capture.stop() + peer.close() + ws.close()
  → client: returns to dashboard state
```

---

## Security Note

No authentication. This is intentional — ThinCloud is accessed over Tailscale WireGuard (encrypted, private network). Do not expose port 3000 to the public internet.

---

## cpulimit Dependency

`cpulimit` must be installed on Mac Mini:
```bash
brew install cpulimit
```

Soft limit only — process can burst above the limit briefly. Hard RAM limits not enforced (macOS limitation without Docker).
