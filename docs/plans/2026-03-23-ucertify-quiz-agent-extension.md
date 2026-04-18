# uCertify Quiz Agent Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome MV3 extension wrapper around the standalone uCertify quiz agent so it can be started from a popup without console paste.

**Architecture:** Reuse the existing extraction engine inside a content script that manages a singleton agent instance and responds to popup messages. Keep the popup thin, with only command dispatch and status rendering.

**Tech Stack:** JavaScript, Chrome Extension Manifest V3, Node test runner, browser DOM APIs

---

### Task 1: Scaffold the extension folder and write the first failing test

**Files:**
- Create: `ucertify-quiz-agent-extension/manifest.json`
- Create: `ucertify-quiz-agent-extension/popup.html`
- Create: `ucertify-quiz-agent-extension/popup.css`
- Create: `ucertify-quiz-agent-extension/popup.js`
- Create: `ucertify-quiz-agent-extension/content-script.js`
- Create: `ucertify-quiz-agent-extension/lib/bridge.js`
- Create: `ucertify-quiz-agent-extension/test/bridge.test.js`

**Step 1: Write the failing test**

Add a test for a bridge helper that turns popup actions into normalized command objects and formats content-script state for the popup.

**Step 2: Run test to verify it fails**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent-extension/test/bridge.test.js`
Expected: FAIL because the module does not exist yet.

**Step 3: Write minimal implementation**

Create the bridge module and the extension scaffold files with the minimal structure required.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent-extension/test/bridge.test.js`
Expected: PASS

**Step 5: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.

### Task 2: Add content-script command tests

**Files:**
- Modify: `ucertify-quiz-agent-extension/test/bridge.test.js`
- Modify: `ucertify-quiz-agent-extension/lib/bridge.js`
- Modify: `ucertify-quiz-agent-extension/content-script.js`

**Step 1: Write the failing test**

Add tests for:
- starting an agent only once
- stopping an existing agent
- downloading saved results
- returning status snapshots with result count

**Step 2: Run test to verify it fails**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent-extension/test/bridge.test.js`
Expected: FAIL on missing command orchestration.

**Step 3: Write minimal implementation**

Implement the command handler and wire it to the existing agent module.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent-extension/test/bridge.test.js`
Expected: PASS

**Step 5: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.

### Task 3: Build the popup UI

**Files:**
- Modify: `ucertify-quiz-agent-extension/popup.html`
- Modify: `ucertify-quiz-agent-extension/popup.css`
- Modify: `ucertify-quiz-agent-extension/popup.js`

**Step 1: Write the failing test**

Add a test for formatting popup status text and button-disabled states based on extension status.

**Step 2: Run test to verify it fails**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent-extension/test/bridge.test.js`
Expected: FAIL on missing popup helpers.

**Step 3: Write minimal implementation**

Implement popup helpers and the UI shell with `Start`, `Stop`, `Download`, and refresh behavior.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent-extension/test/bridge.test.js`
Expected: PASS

**Step 5: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.

### Task 4: Final verification and docs

**Files:**
- Create: `ucertify-quiz-agent-extension/README.md`
- Verify: `ucertify-quiz-agent-extension/manifest.json`
- Verify: `ucertify-quiz-agent-extension/content-script.js`
- Verify: `ucertify-quiz-agent-extension/popup.js`

**Step 1: Run the full test suite**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent-extension/test/bridge.test.js`
Expected: PASS

**Step 2: Validate the manifest JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('/Users/adnan/Documents/ucertify-quiz-agent-extension/manifest.json','utf8')); console.log('manifest ok')"`
Expected: prints `manifest ok`

**Step 3: Document install steps**

Add README instructions for `chrome://extensions` -> `Load unpacked`.

**Step 4: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.
