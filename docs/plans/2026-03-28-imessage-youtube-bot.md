# iMessage YouTube Bot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local macOS bot with `@photon-ai/imessage-kit` that watches iMessages for YouTube URLs, sends the detected URL to the configured `/process` API, and replies in the same thread with the API response.

**Architecture:** Create a small Node.js and TypeScript app with focused modules for config, URL extraction, API calls, response formatting, and message orchestration. Keep watcher setup in one entrypoint and cover the non-SDK logic with unit tests so local macOS verification only needs to validate the final integration.

**Tech Stack:** Node.js, TypeScript, `@photon-ai/imessage-kit`, `better-sqlite3`, native `fetch`, Vitest, dotenv

---

### Task 1: Scaffold the project

**Files:**
- Create: `imessage-youtube-bot/package.json`
- Create: `imessage-youtube-bot/tsconfig.json`
- Create: `imessage-youtube-bot/.gitignore`
- Create: `imessage-youtube-bot/.env.example`
- Create: `imessage-youtube-bot/README.md`

**Step 1: Write the failing test**

Create the test runner setup first so later modules can be added under test without restructuring the project.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: test command exists but fails until test files are added or dependencies are installed.

**Step 3: Write minimal implementation**

Add project metadata, TypeScript config, scripts, environment example, and README skeleton.

**Step 4: Run test to verify it passes**

Run: `npm install && npm test`
Expected: Vitest starts successfully, even if no tests are found yet depending on config.

**Step 5: Commit**

```bash
git add imessage-youtube-bot/package.json imessage-youtube-bot/tsconfig.json imessage-youtube-bot/.gitignore imessage-youtube-bot/.env.example imessage-youtube-bot/README.md
git commit -m "chore: scaffold imessage youtube bot"
```

### Task 2: Add YouTube URL extraction logic

**Files:**
- Create: `imessage-youtube-bot/src/extractYoutubeUrl.ts`
- Create: `imessage-youtube-bot/src/extractYoutubeUrl.test.ts`

**Step 1: Write the failing test**

Add tests for:

- standard `youtube.com/watch?v=...`
- short `youtu.be/...`
- multiple links where only the first YouTube URL is returned
- non-YouTube text returning `null`

**Step 2: Run test to verify it fails**

Run: `npm test -- extractYoutubeUrl`
Expected: FAIL because the extractor does not exist yet.

**Step 3: Write minimal implementation**

Implement a small parser that scans message text and returns the first supported YouTube URL.

**Step 4: Run test to verify it passes**

Run: `npm test -- extractYoutubeUrl`
Expected: PASS

**Step 5: Commit**

```bash
git add imessage-youtube-bot/src/extractYoutubeUrl.ts imessage-youtube-bot/src/extractYoutubeUrl.test.ts
git commit -m "feat: extract youtube urls from messages"
```

### Task 3: Add API client and response formatting

**Files:**
- Create: `imessage-youtube-bot/src/processVideo.ts`
- Create: `imessage-youtube-bot/src/formatResponse.ts`
- Create: `imessage-youtube-bot/src/processVideo.test.ts`
- Create: `imessage-youtube-bot/src/formatResponse.test.ts`

**Step 1: Write the failing test**

Add tests for:

- POST body contains `{ youtubeUrl }`
- success responses return readable text
- JSON bodies choose useful fields like `message`, `result`, `response`, `summary`, or `text`
- empty or malformed responses fall back safely

**Step 2: Run test to verify it fails**

Run: `npm test -- processVideo`
Expected: FAIL because the API client and formatter do not exist yet.

**Step 3: Write minimal implementation**

Implement the API client with `fetch` and a response formatter that supports plain text and common JSON shapes.

**Step 4: Run test to verify it passes**

Run: `npm test -- processVideo`
Expected: PASS

**Step 5: Commit**

```bash
git add imessage-youtube-bot/src/processVideo.ts imessage-youtube-bot/src/formatResponse.ts imessage-youtube-bot/src/processVideo.test.ts imessage-youtube-bot/src/formatResponse.test.ts
git commit -m "feat: add process api client and response formatting"
```

### Task 4: Add message orchestration

**Files:**
- Create: `imessage-youtube-bot/src/handleMessage.ts`
- Create: `imessage-youtube-bot/src/handleMessage.test.ts`

**Step 1: Write the failing test**

Add tests for:

- messages without text are ignored
- messages without YouTube links are ignored
- valid YouTube messages call the API and reply with success text
- API failures trigger a fallback error reply

**Step 2: Run test to verify it fails**

Run: `npm test -- handleMessage`
Expected: FAIL because the handler does not exist yet.

**Step 3: Write minimal implementation**

Create a handler function that wires extraction, processing, formatting, and reply sending together with dependency injection for testability.

**Step 4: Run test to verify it passes**

Run: `npm test -- handleMessage`
Expected: PASS

**Step 5: Commit**

```bash
git add imessage-youtube-bot/src/handleMessage.ts imessage-youtube-bot/src/handleMessage.test.ts
git commit -m "feat: add inbound message handler"
```

### Task 5: Wire the SDK entrypoint

**Files:**
- Create: `imessage-youtube-bot/src/config.ts`
- Create: `imessage-youtube-bot/src/index.ts`

**Step 1: Write the failing test**

Keep this task light by validating config behavior with a small unit test only if needed. Prefer manual verification for SDK wiring.

**Step 2: Run test to verify it fails**

Run: `npm run build`
Expected: FAIL until the config and entrypoint are implemented.

**Step 3: Write minimal implementation**

Initialize environment variables, create the `IMessageSDK`, start watching inbound messages, route events through the handler, and add graceful shutdown.

**Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add imessage-youtube-bot/src/config.ts imessage-youtube-bot/src/index.ts
git commit -m "feat: wire imessage watcher entrypoint"
```

### Task 6: Verify and document local usage

**Files:**
- Modify: `imessage-youtube-bot/README.md`

**Step 1: Write the failing test**

No code test required. Verification is manual and command-based.

**Step 2: Run test to verify it fails**

Run: `npm run build && npm test`
Expected: PASS before README finalization so docs reflect real behavior.

**Step 3: Write minimal implementation**

Document install steps, `.env` setup, Full Disk Access requirements, development commands, and a manual verification flow using an iMessage with a YouTube URL.

**Step 4: Run test to verify it passes**

Run: `npm run build && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add imessage-youtube-bot/README.md
git commit -m "docs: add setup and usage instructions"
```
