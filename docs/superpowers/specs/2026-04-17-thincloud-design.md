# ThinCloud — Design Spec
**Date:** 2026-04-17  
**Version:** 1.0  
**Status:** Approved

---

## 1. Summary

ThinCloud is a self-hosted thin-client service. A full Google Chrome instance runs on a Mac Mini M4 and streams its display to any connected device over LAN or Tailscale. The client is a zero-install browser tab. All compute, storage, and browser state live on the Mac Mini.

---

## 2. Resolved Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Screen capture | `ffmpeg -f avfoundation` | No Swift code; AVFoundation built into FFmpeg; VideoToolbox H.264 HW encode included |
| WebRTC library | `wrtc` with `node-datachannel` fallback | `wrtc` has no prebuilt ARM64 binary as of 2022 — must verify on first deploy |
| Project structure | Single flat Node.js package | Solo project, no monorepo tooling needed |
| Development workflow | Develop locally, deploy via rsync to Mac Mini | Code on dev machine, run on Mac Mini |
| Stream protocol | WebRTC (RTP injection) | <100ms latency, works on Safari iOS, Chrome, Firefox, Edge |

### Critical: WebRTC Library Decision Gate

`wrtc` (node-webrtc) has not released since 2022 and has no confirmed prebuilt Apple Silicon binary. On first deploy to Mac Mini M4:

```bash
# Run check-webrtc.sh — this MUST run before any pipeline code
npm install wrtc
# If it compiles from source → abort, use node-datachannel instead
```

`check-webrtc.sh` automates this: tries `wrtc`, checks for prebuilt binary, falls back to `node-datachannel` (ships prebuilt ARM64), writes `THINCLOUD_WEBRTC_LIB=wrtc|node-datachannel` to `.env`. `webrtc.js` reads this at runtime — caller code never changes.

---

## 3. Project Structure

```
thincloud/
├── src/
│   ├── server.js          # Express + WebSocket + signaling state machine
│   ├── capture.js         # FFmpeg process manager
│   ├── webrtc.js          # WebRTC adapter (wrtc or node-datachannel)
│   ├── input.js           # nut.js HID relay
│   ├── auth.js            # JWT issue + verify
│   └── client/
│       └── index.html     # Vanilla JS SPA, single file, <50KB
├── scripts/
│   ├── deploy.sh          # rsync + SSH restart
│   └── check-webrtc.sh    # Decision gate script
├── launchd/
│   └── com.thincloud.plist
├── .env.example
└── package.json
```

---

## 4. Data Flow

### Streaming (Mac Mini → Client)

```
FFmpeg (-f avfoundation, capture_cursor=1)
  → H.264 encode via VideoToolbox (-vcodec h264_videotoolbox, -b:v 4000k, -r 30)
  → RTP mux (-f rtp rtp://127.0.0.1:5004)
  → UDP socket localhost:5004 → Node.js dgram socket binds :5004
  → webrtc.js feeds RTP packets into outbound MediaStreamTrack
  → WebRTC UDP to client browser
  → <video autoplay> renders
```

FFmpeg starts only after a client connects and ICE completes. FFmpeg is killed on disconnect — no idle encoding.

### Input (Client → Mac Mini)

```
Client mouse/keyboard/touch events
  → JSON {type, x, y, button, key, modifiers} over WebSocket
  → input.js → nut.js native HID injection into macOS
  → Chrome receives events as local user input
```

Touch events translated to mouse equivalents client-side before sending.

### Signaling (Connection Setup)

```
Client loads index.html
  → POST /auth {secret} → JWT
  → WebSocket connect /signal (JWT verified on upgrade)
  → Client sends SDP offer
  → Server creates RTCPeerConnection, attaches FFmpeg RTP track
  → Server sends SDP answer
  → ICE candidates exchanged over WebSocket
  → WebRTC media established
  → WebSocket repurposed for input events
```

---

## 5. Component Responsibilities

### `capture.js`
- `start()` — spawns FFmpeg (AVFoundation input, VideoToolbox encode, RTP → UDP 127.0.0.1:5004), binds `dgram` UDP socket on port 5004, emits `data` events per RTP packet
- `stop()` — kills FFmpeg process, closes UDP socket

FFmpeg command:
```bash
ffmpeg -f avfoundation -capture_cursor 1 -i "1" \
  -vcodec h264_videotoolbox -b:v 4000k -r 30 \
  -f rtp rtp://127.0.0.1:5004
```

### `webrtc.js`
- Reads `THINCLOUD_WEBRTC_LIB` from `.env`
- Exposes uniform interface: `createPeer(offer) → answer`, `feedRTP(packet)`
- Internally loads `wrtc` or `node-datachannel` — callers are unaffected

### `input.js`
- Receives JSON input events from WebSocket
- Maps to `nut.js`: `mouse.move()`, `mouse.click()`, `keyboard.type()`, `keyboard.pressKey()`
- Write-only — cannot read screen or clipboard

### `auth.js`
- `POST /auth` — accepts `secret` (env var `THINCLOUD_SECRET`), returns 8h JWT
- `verifyToken(token)` — used on WebSocket upgrade
- No sessions stored server-side

### `server.js`
- Express: serves `client/index.html`, handles `POST /auth`
- WebSocket server on `/signal`: verifies JWT on upgrade, runs signaling state machine
- Enforces single active client — second connection rejected with HTTP 409
- On ICE complete: calls `capture.start()`, pipes RTP to `webrtc.js`
- On disconnect: calls `capture.stop()`, clears peer state

### `client/index.html`
- Single HTML file, no framework, no build step
- WebRTC offer/answer/ICE negotiation
- `<video autoplay playsinline>` for stream display
- Mouse, keyboard, touch event capture → WebSocket JSON
- Fullscreen toggle
- Latency indicator via `RTCPeerConnection.getStats()`
- Connection status display (connecting / live / disconnected)
- Auto-retry on disconnect: 5s interval, max 3 attempts

---

## 6. Error Handling

| Failure | Behavior |
|---|---|
| FFmpeg crash | `capture.js` emits `error` → server closes peer → client shows reconnect prompt |
| WebRTC library crash | Same teardown; launchd restarts Node.js process |
| Client disconnect | FFmpeg killed immediately; peer state cleared; server ready for next connection |
| Client reconnect within 60s | New signaling flow, new peer, FFmpeg restarts — no session loss in Chrome (Chrome kept running) |
| Second client connects | Rejected with 409 |

---

## 7. Security

- `THINCLOUD_SECRET` in `.env` only — never in source code, excluded from rsync
- JWT required on all WebSocket connections; 8h expiry
- HTTPS via mkcert self-signed cert loaded in Express (LAN)
- Remote access via Tailscale (WireGuard) — no inbound ports on ISP router
- Input relay is write-only (nut.js)
- Single-client enforcement prevents session snooping
- Dedicated macOS user account for ThinCloud service recommended

**macOS permissions** (one-time, granted in System Settings > Privacy & Security):
- Screen Recording → `node` binary
- Accessibility → `node` binary

---

## 8. Deploy & Operations

### Ongoing deploys
```bash
./scripts/deploy.sh
# rsync src/ package.json scripts/ launchd/ to Mac Mini (excludes .env, node_modules)
# SSH: npm install --omit=dev
# SSH: launchctl unload → launchctl load (service restart)
```

### First-time Mac Mini setup (manual, one-time)
1. Install Homebrew, Node.js, FFmpeg
2. Run `./scripts/check-webrtc.sh` — resolves WebRTC library, writes to `.env`
3. Grant Screen Recording + Accessibility to `node` in System Settings
4. Copy `launchd/com.thincloud.plist` to `~/Library/LaunchAgents/`
5. Set `THINCLOUD_SECRET` in `.env`
6. `launchctl load ~/Library/LaunchAgents/com.thincloud.plist`

### launchd config
- `KeepAlive = true` — restart on crash
- `caffeinate -i` wrapper — prevents Mac Mini sleep
- Logs: `~/Library/Logs/thincloud/`

### Access URLs
- LAN: `https://<mac-mini-local-ip>:3000`
- Remote: `https://<tailscale-ip>:3000`

---

## 9. Out of Scope (v1)

- Audio streaming
- Multi-user concurrent sessions
- Other browsers (Chrome only on Mac Mini)
- Cloud hosting
- Browser extension or native client app

---

## 10. Success Metrics

- End-to-end latency <50ms on local network
- Stream stable at 1080p30 over 1-hour session with no dropped frames
- Client works on: Safari iOS, Chrome Android, Chrome desktop, Firefox
- Cold start (boot → usable Chrome stream) <10 seconds
- Zero session loss on client disconnect/reconnect within 60 seconds
