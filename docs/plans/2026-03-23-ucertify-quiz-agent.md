# uCertify Quiz Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone browser-side uCertify quiz agent that extracts all questions and correct answers, advances automatically, deduplicates records, and downloads JSON.

**Architecture:** Keep the logic in a reusable core module with a uCertify-specific adapter layer for selectors and extraction. Expose a browser-friendly runner API that can be pasted into the console while keeping the pure logic testable under Node with mocked DOM objects.

**Tech Stack:** JavaScript, Node test runner, browser DOM APIs, MutationObserver

---

### Task 1: Scaffold the standalone project

**Files:**
- Create: `ucertify-quiz-agent/package.json`
- Create: `ucertify-quiz-agent/README.md`
- Create: `ucertify-quiz-agent/src/ucertify-agent.js`
- Create: `ucertify-quiz-agent/test/ucertify-agent.test.js`

**Step 1: Write the failing test**

Create an initial test file that imports the future module and asserts that explanation parsing and progress parsing functions exist and return expected values.

**Step 2: Run test to verify it fails**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: FAIL because the module or exports do not exist yet.

**Step 3: Write minimal implementation**

Create the module with the smallest exported functions needed for the first tests to pass.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: PASS

**Step 5: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.

### Task 2: Add extraction tests for uCertify review markup

**Files:**
- Modify: `ucertify-quiz-agent/test/ucertify-agent.test.js`
- Modify: `ucertify-quiz-agent/src/ucertify-agent.js`

**Step 1: Write the failing test**

Add tests for:
- extracting question text from `.global_ques`
- collecting all options from `label.option`
- detecting the correct answer from checked inputs and `.icomoon-correct`
- falling back to `Answer D is correct`
- deduplicating by `contentGuid`

**Step 2: Run test to verify it fails**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: FAIL on missing extraction behavior.

**Step 3: Write minimal implementation**

Implement the smallest extraction and storage helpers needed to satisfy the tests.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: PASS

**Step 5: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.

### Task 3: Add autonomous navigation loop tests

**Files:**
- Modify: `ucertify-quiz-agent/test/ucertify-agent.test.js`
- Modify: `ucertify-quiz-agent/src/ucertify-agent.js`

**Step 1: Write the failing test**

Add tests for:
- stopping when `current >= total`
- clicking next when more questions remain
- refusing to save duplicate records
- returning a downloadable JSON payload

**Step 2: Run test to verify it fails**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: FAIL on missing runner behavior.

**Step 3: Write minimal implementation**

Implement the async runner, next-button click helper, wait-for-change logic hooks, and JSON serialization/download helper.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: PASS

**Step 5: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.

### Task 4: Add browser-console wrapper and usage docs

**Files:**
- Modify: `ucertify-quiz-agent/src/ucertify-agent.js`
- Modify: `ucertify-quiz-agent/README.md`

**Step 1: Write the failing test**

Add a test that the factory exposes `run`, `stop`, `download`, and `state`.

**Step 2: Run test to verify it fails**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: FAIL because the public surface is incomplete.

**Step 3: Write minimal implementation**

Attach the agent factory to `window` when running in the browser and document the console usage in the README.

**Step 4: Run test to verify it passes**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: PASS

**Step 5: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.

### Task 5: Final verification

**Files:**
- Verify: `ucertify-quiz-agent/src/ucertify-agent.js`
- Verify: `ucertify-quiz-agent/test/ucertify-agent.test.js`
- Verify: `ucertify-quiz-agent/README.md`

**Step 1: Run the full test suite**

Run: `node --test /Users/adnan/Documents/ucertify-quiz-agent/test/ucertify-agent.test.js`
Expected: PASS

**Step 2: Sanity-check the generated browser API**

Run: `node -e "const mod=require('/Users/adnan/Documents/ucertify-quiz-agent/src/ucertify-agent.js'); console.log(Object.keys(mod))"`
Expected: includes the extraction helpers and the public factory.

**Step 3: Review the README**

Confirm it includes console usage, output shape, and the uCertify-specific assumptions.

**Step 4: Commit**

Skip commit if no enclosing git repository is chosen for this standalone folder.
