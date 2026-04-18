# ThinCloud Launcher UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace auth-gated single-app client with a no-auth dashboard showing live Mac Mini stats, a configurable app launcher grid, per-app CPU limit controls, and a full-screen stream view.

**Architecture:** Server gains `/api/stats`, `/api/apps`, `POST /api/launch/:id`, `DELETE /api/session` endpoints. `launcher.js` replaces `chrome.js` — reads `apps.json`, spawns apps with soft CPU limits via `cpulimit`. Client is a single-page vanilla JS app with three states: Dashboard → Config panel → Stream.

**Tech Stack:** Node.js, Express, vanilla JS, node-datachannel, cpulimit (brew)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps.json` | Create | App list config — id, name, icon, path, defaultCpu |
| `src/launcher.js` | Create | Spawn app by id, apply cpulimit, kill on stop |
| `src/server.js` | Modify | Remove auth, add 4 new routes, wire launcher |
| `src/client/index.html` | Rewrite | Dashboard + config panel + stream, three states |
| `src/auth.js` | Delete | No longer needed |
| `src/chrome.js` | Delete | Replaced by launcher.js |

---

### Task 1: Create apps.json

**Files:**
- Create: `apps.json`

- [ ] **Step 1: Create apps.json at repo root**

```json
[
  {
    "id": "chrome",
    "name": "Google Chrome",
    "icon": "🌐",
    "path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "args": ["--user-data-dir=/Users/Shared/thincloud/chrome-profile", "--no-first-run", "--disable-infobars"],
    "defaultCpu": 50
  },
  {
    "id": "vscode",
    "name": "VS Code",
    "icon": "💻",
    "path": "/Applications/Visual Studio Code.app/Contents/MacOS/Electron",
    "args": [],
    "defaultCpu": 40
  },
  {
    "id": "safari",
    "name": "Safari",
    "icon": "🧭",
    "path": "/Applications/Safari.app/Contents/MacOS/Safari",
    "args": [],
    "defaultCpu": 40
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add apps.json
git commit -m "feat: add apps.json launcher config"
```

---

### Task 2: Create launcher.js

**Files:**
- Create: `src/launcher.js`
- Delete: `src/chrome.js`

- [ ] **Step 1: Write src/launcher.js**

```js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const APPS_PATH = path.join(__dirname, '..', 'apps.json');

function loadApps() {
  return JSON.parse(fs.readFileSync(APPS_PATH, 'utf8'));
}

let appProc = null;
let cpulimitProc = null;
let runningAppId = null;

function launchApp(app, cpuLimit) {
  if (appProc) throw new Error('Session already active');

  // Ensure profile dir exists for Chrome
  if (app.args) {
    const udArg = app.args.find(a => a.startsWith('--user-data-dir='));
    if (udArg) {
      const dir = udArg.split('=')[1];
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  appProc = spawn(app.path, app.args || [], {
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: false,
  });

  runningAppId = app.id;

  appProc.on('exit', () => {
    appProc = null;
    runningAppId = null;
    if (cpulimitProc) { cpulimitProc.kill('SIGTERM'); cpulimitProc = null; }
  });

  // Apply soft CPU limit after brief delay (process needs to start first)
  setTimeout(() => {
    if (!appProc || !appProc.pid) return;
    cpulimitProc = spawn('cpulimit', ['-l', String(cpuLimit), '-p', String(appProc.pid)], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    cpulimitProc.on('exit', () => { cpulimitProc = null; });
  }, 500);
}

function killApp() {
  if (cpulimitProc) { cpulimitProc.kill('SIGTERM'); cpulimitProc = null; }
  if (appProc) { appProc.kill('SIGTERM'); appProc = null; }
  runningAppId = null;
}

function isRunning() {
  return appProc !== null;
}

function getRunningAppId() {
  return runningAppId;
}

module.exports = { loadApps, launchApp, killApp, isRunning, getRunningAppId };
```

- [ ] **Step 2: Delete src/chrome.js**

```bash
git rm src/chrome.js
```

- [ ] **Step 3: Commit**

```bash
git add src/launcher.js
git commit -m "feat: add launcher.js — generic app launcher with cpulimit support"
```

---

### Task 3: Add /api/stats, /api/apps endpoints to server.js

**Files:**
- Modify: `src/server.js`

- [ ] **Step 1: Read current server.js to understand structure**

Read `src/server.js` lines 1–50.

- [ ] **Step 2: Add stats helper and two GET routes**

Add after the `require` block at top of `src/server.js`:

```js
const os = require('os');
const { execSync } = require('child_process');
const { loadApps } = require('./launcher');

function getCpuPercent() {
  return new Promise((resolve) => {
    const sample = () => os.cpus().map(c => ({ ...c.times }));
    const t1 = sample();
    setTimeout(() => {
      const t2 = sample();
      let idle = 0, total = 0;
      t1.forEach((c, i) => {
        const d = {};
        Object.keys(c).forEach(k => { d[k] = t2[i][k] - c[k]; });
        const sum = Object.values(d).reduce((a, b) => a + b, 0);
        idle += d.idle;
        total += sum;
      });
      resolve(Math.round((1 - idle / total) * 100));
    }, 500);
  });
}

function getDiskStats() {
  try {
    const out = execSync('df -k /').toString().split('\n')[1].trim().split(/\s+/);
    const used = Math.round(parseInt(out[2]) / 1024 / 1024);
    const total = Math.round((parseInt(out[2]) + parseInt(out[3])) / 1024 / 1024);
    return { diskUsed: used, diskTotal: total };
  } catch {
    return { diskUsed: 0, diskTotal: 0 };
  }
}
```

Then inside `createApp()`, after `app.use(express.json())`, add:

```js
  app.get('/api/stats', async (req, res) => {
    const cpu = await getCpuPercent();
    const memTotal = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10;
    const memUsed = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024 * 10) / 10;
    const { diskUsed, diskTotal } = getDiskStats();
    res.json({ cpu, memUsed, memTotal, diskUsed, diskTotal });
  });

  app.get('/api/apps', (req, res) => {
    try {
      res.json(loadApps());
    } catch (err) {
      res.status(500).json({ error: 'Failed to load apps.json' });
    }
  });
```

- [ ] **Step 3: Commit**

```bash
git add src/server.js
git commit -m "feat: add /api/stats and /api/apps endpoints"
```

---

### Task 4: Add /api/launch/:id and DELETE /api/session to server.js

**Files:**
- Modify: `src/server.js`

- [ ] **Step 1: Add launch and session endpoints**

Inside `createApp()`, after the `/api/apps` route, add:

```js
  app.post('/api/launch/:id', (req, res) => {
    const apps = loadApps();
    const app = apps.find(a => a.id === req.params.id);
    if (!app) return res.status(404).json({ error: 'App not found' });
    if (launcher.isRunning()) return res.status(409).json({ error: 'Session already active' });
    const cpuLimit = (req.body && req.body.cpuLimit) ? parseInt(req.body.cpuLimit) : app.defaultCpu;
    try {
      launcher.launchApp(app, cpuLimit);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/session', (req, res) => {
    if (activeCapture) { activeCapture.stop(); activeCapture = null; }
    if (activePeer) { activePeer.close(); activePeer = null; }
    if (activeWs) { activeWs.close(); activeWs = null; }
    launcher.killApp();
    res.json({ ok: true });
  });
```

Also add at top of `server.js` require block:

```js
const launcher = require('./launcher');
```

- [ ] **Step 2: Remove old chrome.js import and launchChrome() call**

Remove this line from `src/server.js`:
```js
const { launchChrome } = require('./chrome');
```

Remove this line from the `wss.on('connection', ...)` handler:
```js
    launchChrome();
```

- [ ] **Step 3: Commit**

```bash
git add src/server.js
git commit -m "feat: add /api/launch/:id and DELETE /api/session, remove chrome.js wiring"
```

---

### Task 5: Remove auth from server.js

**Files:**
- Modify: `src/server.js`
- Delete: `src/auth.js`

- [ ] **Step 1: Remove auth imports and POST /auth route**

Remove from `src/server.js`:
```js
const { issueToken, verifyToken } = require('./auth');
```

Remove the entire `app.post('/auth', ...)` block.

Remove the `safeCompare` function.

Remove the `crypto` require if only used by `safeCompare`:
```js
const crypto = require('crypto');
```

- [ ] **Step 2: Remove JWT token check from WebSocket upgrade handler**

In `server.on('upgrade', ...)`, remove:
```js
    const token = query.token;
    try {
      verifyToken(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
```

The upgrade handler should now just check `pathname === '/signal'` and reject second client (409). No token needed.

- [ ] **Step 3: Delete src/auth.js**

```bash
git rm src/auth.js
```

- [ ] **Step 4: Remove auth-related packages from package.json**

Remove `"jsonwebtoken"` from dependencies in `package.json`.

- [ ] **Step 5: Commit**

```bash
git add src/server.js package.json
git commit -m "feat: remove auth — no login required, open access over Tailscale"
```

---

### Task 6: Rewrite client/index.html — Dashboard + Config Panel

**Files:**
- Rewrite: `src/client/index.html`

- [ ] **Step 1: Write the full new index.html**

Replace `src/client/index.html` entirely with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ThinCloud</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0f; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; }

    /* ── DASHBOARD ── */
    #dashboard { display: flex; flex-direction: column; min-height: 100vh; padding: 32px; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; }
    .header h1 { font-size: 22px; font-weight: 600; color: #f1f5f9; letter-spacing: -0.5px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }

    .stats-row { display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap; }
    .stat-card { background: #13131a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 20px 24px; flex: 1; min-width: 140px; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
    .stat-value { font-size: 28px; font-weight: 700; color: #f1f5f9; }
    .stat-sub { font-size: 12px; color: #475569; margin-top: 4px; }
    .stat-value.warn { color: #f59e0b; }
    .stat-value.danger { color: #ef4444; }

    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 16px; }
    .apps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
    .app-card { background: #13131a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 24px 20px; cursor: pointer; transition: border-color 0.15s, background 0.15s; text-align: center; }
    .app-card:hover { border-color: #3b82f6; background: #16161f; }
    .app-icon { font-size: 36px; margin-bottom: 12px; }
    .app-name { font-size: 13px; font-weight: 500; color: #cbd5e1; }

    /* ── CONFIG PANEL ── */
    #config-panel { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 50; }
    #config-panel.open { display: flex; }
    .config-box { background: #13131a; border: 1px solid #1e1e2e; border-radius: 16px; padding: 32px; width: 380px; max-width: 90vw; }
    .config-app-name { font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #f1f5f9; }
    .config-app-icon { font-size: 40px; margin-bottom: 16px; }
    .config-row { margin-bottom: 24px; }
    .config-row-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: flex; justify-content: space-between; }
    .config-row-label span { color: #94a3b8; font-size: 14px; text-transform: none; letter-spacing: 0; }
    input[type=range] { width: 100%; accent-color: #3b82f6; cursor: pointer; }
    .mem-info { font-size: 14px; color: #94a3b8; }
    .config-actions { display: flex; gap: 12px; margin-top: 8px; }
    .btn-launch { flex: 1; padding: 12px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .btn-launch:hover { background: #2563eb; }
    .btn-cancel { padding: 12px 20px; background: #1e1e2e; color: #94a3b8; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
    .btn-cancel:hover { background: #252535; }
    .config-error { color: #ef4444; font-size: 13px; margin-top: 8px; min-height: 18px; }

    /* ── STREAM VIEW ── */
    #stream-view { display: none; position: fixed; inset: 0; background: #000; flex-direction: column; }
    #stream-view.active { display: flex; }
    #stream-bar { display: flex; align-items: center; gap: 12px; padding: 6px 16px; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); border-bottom: 1px solid #1e1e2e; flex-shrink: 0; z-index: 10; height: 40px; }
    #stream-app-name { font-size: 13px; font-weight: 500; color: #e2e8f0; }
    #stream-cpu { font-size: 12px; color: #64748b; margin-left: auto; }
    #stream-latency { font-size: 12px; color: #475569; }
    .btn-back { font-size: 12px; padding: 4px 12px; background: #1e1e2e; border: none; color: #94a3b8; border-radius: 6px; cursor: pointer; }
    .btn-back:hover { background: #252535; color: #e2e8f0; }
    #fullscreen-btn { font-size: 12px; padding: 4px 10px; background: #1e1e2e; border: none; color: #94a3b8; border-radius: 6px; cursor: pointer; }
    #video { flex: 1; width: 100%; object-fit: contain; }
  </style>
</head>
<body>

<!-- DASHBOARD -->
<div id="dashboard">
  <div class="header">
    <div class="dot"></div>
    <h1>ThinCloud</h1>
  </div>
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-label">CPU</div>
      <div class="stat-value" id="stat-cpu">—</div>
      <div class="stat-sub">utilization</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Memory</div>
      <div class="stat-value" id="stat-mem">—</div>
      <div class="stat-sub" id="stat-mem-sub">GB used</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Disk</div>
      <div class="stat-value" id="stat-disk">—</div>
      <div class="stat-sub" id="stat-disk-sub">GB used</div>
    </div>
  </div>
  <div class="section-title">Applications</div>
  <div class="apps-grid" id="apps-grid">
    <div style="color:#475569;font-size:13px;">Loading apps…</div>
  </div>
</div>

<!-- CONFIG PANEL -->
<div id="config-panel">
  <div class="config-box">
    <div class="config-app-icon" id="config-icon"></div>
    <div class="config-app-name" id="config-name"></div>
    <div class="config-row">
      <div class="config-row-label">CPU Limit <span id="cpu-val">50%</span></div>
      <input type="range" id="cpu-slider" min="10" max="100" value="50">
    </div>
    <div class="config-row">
      <div class="config-row-label">Memory Available</div>
      <div class="mem-info" id="config-mem">—</div>
    </div>
    <div class="config-actions">
      <button class="btn-cancel" onclick="closeConfig()">Cancel</button>
      <button class="btn-launch" onclick="launchApp()">Launch</button>
    </div>
    <div class="config-error" id="config-error"></div>
  </div>
</div>

<!-- STREAM VIEW -->
<div id="stream-view">
  <div id="stream-bar">
    <button class="btn-back" onclick="backToLauncher()">⬅ Launcher</button>
    <span id="stream-app-name"></span>
    <span id="stream-cpu"></span>
    <span id="stream-latency"></span>
    <button id="fullscreen-btn" onclick="toggleFullscreen()">⛶</button>
  </div>
  <video id="video" autoplay playsinline muted></video>
</div>

<script>
  // ── State ──
  let selectedApp = null;
  let statsInterval = null;
  let streamCpuInterval = null;
  let ws = null;
  let pc = null;
  let retries = 0;
  const MAX_RETRIES = 3;

  // ── Boot ──
  loadStats();
  loadApps();
  statsInterval = setInterval(loadStats, 3000);

  async function loadStats() {
    try {
      const s = await fetch('/api/stats').then(r => r.json());
      const cpuEl = document.getElementById('stat-cpu');
      cpuEl.textContent = s.cpu + '%';
      cpuEl.className = 'stat-value' + (s.cpu > 80 ? ' danger' : s.cpu > 60 ? ' warn' : '');
      document.getElementById('stat-mem').textContent = s.memUsed + ' GB';
      document.getElementById('stat-mem-sub').textContent = `of ${s.memTotal} GB`;
      document.getElementById('stat-disk').textContent = s.diskUsed + ' GB';
      document.getElementById('stat-disk-sub').textContent = `of ${s.diskTotal} GB`;
    } catch (_) {}
  }

  async function loadApps() {
    try {
      const apps = await fetch('/api/apps').then(r => r.json());
      const grid = document.getElementById('apps-grid');
      grid.innerHTML = apps.map(app => `
        <div class="app-card" onclick="openConfig(${JSON.stringify(JSON.stringify(app))})">
          <div class="app-icon">${app.icon}</div>
          <div class="app-name">${app.name}</div>
        </div>
      `).join('');
    } catch (_) {
      document.getElementById('apps-grid').innerHTML = '<div style="color:#ef4444;font-size:13px;">Failed to load apps</div>';
    }
  }

  // ── Config panel ──
  function openConfig(appJson) {
    selectedApp = JSON.parse(appJson);
    document.getElementById('config-icon').textContent = selectedApp.icon;
    document.getElementById('config-name').textContent = selectedApp.name;
    document.getElementById('config-error').textContent = '';
    const slider = document.getElementById('cpu-slider');
    slider.value = selectedApp.defaultCpu;
    document.getElementById('cpu-val').textContent = selectedApp.defaultCpu + '%';
    // Show current free memory
    fetch('/api/stats').then(r => r.json()).then(s => {
      const free = Math.round((s.memTotal - s.memUsed) * 10) / 10;
      document.getElementById('config-mem').textContent = free + ' GB free';
    }).catch(() => {});
    document.getElementById('config-panel').classList.add('open');
  }

  document.getElementById('cpu-slider').addEventListener('input', function() {
    document.getElementById('cpu-val').textContent = this.value + '%';
  });

  function closeConfig() {
    selectedApp = null;
    document.getElementById('config-panel').classList.remove('open');
  }

  async function launchApp() {
    if (!selectedApp) return;
    const cpuLimit = parseInt(document.getElementById('cpu-slider').value);
    document.getElementById('config-error').textContent = '';
    try {
      const res = await fetch(`/api/launch/${selectedApp.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpuLimit }),
      });
      if (res.status === 409) { document.getElementById('config-error').textContent = 'Session already active'; return; }
      if (!res.ok) { document.getElementById('config-error').textContent = 'Launch failed'; return; }
      closeConfig();
      startStream(selectedApp);
    } catch (_) {
      document.getElementById('config-error').textContent = 'Server unreachable';
    }
  }

  // ── Stream ──
  function startStream(app) {
    clearInterval(statsInterval);
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('stream-view').classList.add('active');
    document.getElementById('stream-app-name').textContent = app.name;
    streamCpuInterval = setInterval(async () => {
      try {
        const s = await fetch('/api/stats').then(r => r.json());
        document.getElementById('stream-cpu').textContent = `CPU ${s.cpu}%`;
      } catch (_) {}
    }, 3000);
    connectWebRTC();
  }

  async function connectWebRTC() {
    pc = new RTCPeerConnection({ iceServers: [] });
    pc.ontrack = (e) => {
      const video = document.getElementById('video');
      video.srcObject = e.streams[0];
      retries = 0;
      startLatencyMonitor();
    };
    await pc.setLocalDescription(await pc.createOffer({ offerToReceiveVideo: true }));
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/signal`);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription.sdp }));
    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'answer') await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
      if (msg.type === 'ice' && msg.candidate) pc.addIceCandidate(msg.candidate).catch(() => {});
    };
    ws.onclose = () => {
      if (retries < MAX_RETRIES) { retries++; setTimeout(connectWebRTC, 5000); }
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ice', candidate }));
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    const video = document.getElementById('video');
    video.addEventListener('touchstart', onTouch, { passive: true });
    video.addEventListener('touchmove', onTouch, { passive: true });
  }

  async function backToLauncher() {
    // Cleanup stream
    clearInterval(streamCpuInterval);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    if (ws) { ws.onclose = null; ws.close(); ws = null; }
    if (pc) { pc.close(); pc = null; }
    document.getElementById('video').srcObject = null;
    // Kill app on server
    try { await fetch('/api/session', { method: 'DELETE' }); } catch (_) {}
    // Return to dashboard
    document.getElementById('stream-view').classList.remove('active');
    document.getElementById('dashboard').style.display = 'flex';
    retries = 0;
    statsInterval = setInterval(loadStats, 3000);
    loadStats();
  }

  // ── Input relay ──
  function sendInput(event) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input', event }));
  }
  function scaleCoords(clientX, clientY) {
    const video = document.getElementById('video');
    const rect = video.getBoundingClientRect();
    return {
      x: Math.round((clientX - rect.left) / rect.width * 1920),
      y: Math.round((clientY - rect.top) / rect.height * 1080),
    };
  }
  function onMouseMove(e) { const {x,y} = scaleCoords(e.clientX,e.clientY); sendInput({type:'mousemove',x,y}); }
  function onMouseDown(e) { const {x,y} = scaleCoords(e.clientX,e.clientY); sendInput({type:'mousedown',x,y,button:e.button===2?'right':'left'}); }
  function onMouseUp(e) { const {x,y} = scaleCoords(e.clientX,e.clientY); sendInput({type:'mouseup',x,y,button:e.button===2?'right':'left'}); }
  function onWheel(e) { const {x,y} = scaleCoords(e.clientX,e.clientY); sendInput({type:'wheel',x,y,deltaX:e.deltaX,deltaY:e.deltaY}); }
  function onKeyDown(e) { e.preventDefault(); const m=[]; if(e.ctrlKey)m.push('ctrl'); if(e.shiftKey)m.push('shift'); if(e.altKey)m.push('alt'); if(e.metaKey)m.push('meta'); sendInput({type:'keydown',key:e.key,modifiers:m}); }
  function onKeyUp(e) { const m=[]; if(e.ctrlKey)m.push('ctrl'); if(e.shiftKey)m.push('shift'); if(e.altKey)m.push('alt'); if(e.metaKey)m.push('meta'); sendInput({type:'keyup',key:e.key,modifiers:m}); }
  function onTouch(e) { const t=e.touches[0]; const {x,y}=scaleCoords(t.clientX,t.clientY); sendInput({type:e.type==='touchstart'?'mousedown':'mousemove',x,y,button:'left'}); }

  // ── Misc ──
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
  let latencyInterval = null;
  function startLatencyMonitor() {
    if (latencyInterval) clearInterval(latencyInterval);
    latencyInterval = setInterval(async () => {
      if (!pc) return;
      const stats = await pc.getStats();
      stats.forEach(r => {
        if (r.type === 'inbound-rtp' && r.kind === 'video') {
          document.getElementById('stream-latency').textContent = `~${Math.round((r.jitter||0)*1000)}ms jitter`;
        }
      });
    }, 2000);
  }
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/client/index.html
git commit -m "feat: new dashboard UI — stats, app grid, config panel, stream view"
```

---

### Task 7: Wire launcher into server.js WS connection handler

**Files:**
- Modify: `src/server.js`

- [ ] **Step 1: Update WebSocket upgrade handler to remove token query**

In `server.on('upgrade', ...)`, the `url.parse` still reads `query.token` — remove the token usage. The handler should be:

```js
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = url.parse(req.url, true);
    if (pathname !== '/signal') {
      socket.destroy();
      return;
    }
    if (activeWs) {
      socket.write('HTTP/1.1 409 Conflict\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
```

- [ ] **Step 2: Remove launchChrome from wss.on('connection') if still present**

In `wss.on('connection', (ws) => { ... })` remove any remaining `launchChrome()` call. The app is now launched via `POST /api/launch/:id` before the WebSocket connects.

- [ ] **Step 3: Commit**

```bash
git add src/server.js
git commit -m "fix: remove token check from WS upgrade handler"
```

---

### Task 8: Deploy and install cpulimit on Mac Mini

**Files:**
- No code changes

- [ ] **Step 1: Install cpulimit on Mac Mini**

```bash
ssh claw@100.64.248.114 "export PATH=/opt/homebrew/bin:/usr/local/bin:\$PATH && brew install cpulimit && cpulimit --version"
```

Expected: `CPUlimit version X.X`

- [ ] **Step 2: Deploy**

```bash
./scripts/deploy.sh
```

- [ ] **Step 3: Verify service running**

```bash
curl -s http://100.64.248.114:3000/api/apps | head -c 200
```

Expected: JSON array with app list.

- [ ] **Step 4: Verify stats endpoint**

```bash
curl -s http://100.64.248.114:3000/api/stats
```

Expected: `{"cpu":X,"memUsed":X,"memTotal":X,"diskUsed":X,"diskTotal":X}`

---

## Self-Review

**Spec coverage:**
- ✅ No auth — Tasks 5 removes all JWT/secret code
- ✅ Dashboard with live stats — Task 3, Task 6
- ✅ App grid from apps.json — Tasks 1, 2, 3, 6
- ✅ Config panel with CPU slider — Task 6
- ✅ Launch app with cpulimit — Tasks 2, 4
- ✅ Stream view with Launcher button — Task 6
- ✅ DELETE /api/session — Task 4
- ✅ cpulimit install — Task 8

**Type consistency:**
- `loadApps()` defined in Task 2 (`launcher.js`), used in Tasks 3 and 4 (`server.js`) — consistent ✅
- `launchApp(app, cpuLimit)` / `killApp()` / `isRunning()` defined in Task 2, used in Task 4 — consistent ✅
- `/api/stats` response shape `{cpu, memUsed, memTotal, diskUsed, diskTotal}` defined in Task 3, consumed in Task 6 — consistent ✅
- WebSocket URL `ws://host/signal` (no token) consistent across Tasks 5, 6, 7 ✅
