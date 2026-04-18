# Open WebUI Company Categories Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add company-based categorization to the Open WebUI model catalog and sort models within a selected company by a curated popularity proxy.

**Architecture:** Enrich the merged model list in the Open WebUI backend with derived company metadata, company tags, and a deterministic popularity rank. Use that metadata in the API response so the existing UI can filter by company tag and receive company-prioritized ordering without breaking current model switching or the custom `deepseek-chat` alias.

**Tech Stack:** Python, FastAPI, Open WebUI backend utilities, Docker-hosted Open WebUI API

---

### Task 1: Locate the live Open WebUI source used for this container change

**Files:**
- Inspect: Open WebUI source checkout or mounted workspace for the running container

**Step 1: Find the editable source**

Run: identify whether this customization should be made in a local Open WebUI checkout or by copying files from the running container into a workspace.

**Step 2: Verify the key files**

Expected backend file:
- `open_webui/utils/models.py`

**Step 3: Record the exact working path**

Write down the path that will actually be edited and tested.

### Task 2: Add failing tests for company extraction and ranking

**Files:**
- Modify: backend test file covering `open_webui/utils/models.py`
- If missing, create: test file for model enrichment/sorting helpers

**Step 1: Write the failing test**

Cover:
- company parsed from model IDs
- fallback to `owned_by`
- alias model inherits base-model company
- selected-company sorting prefers curated priority over alphabetical order

**Step 2: Run test to verify it fails**

Run: the smallest targeted pytest command for the new helper tests.

**Step 3: Confirm failure reason**

Expected: missing helper or missing enriched fields / wrong ordering.

### Task 3: Extract company and popularity helpers

**Files:**
- Modify: `open_webui/utils/models.py`

**Step 1: Add minimal helper functions**

Implement helpers for:
- `extract_company(model)`
- `normalize_company(company)`
- `get_popularity_rank(model)`

**Step 2: Keep the ranking data small**

Only include curated entries for the major families you expect to use first.

**Step 3: Run targeted tests**

Run the same pytest target and confirm helper tests pass.

### Task 4: Enrich merged model payloads

**Files:**
- Modify: `open_webui/utils/models.py`

**Step 1: Apply enrichment to base and custom models**

Attach:
- `company`
- `company_normalized`
- `popularity_rank`
- `company:<normalized>` tag

**Step 2: Preserve existing behavior**

Do not break:
- `owned_by`
- `connection_type`
- custom alias model handling
- existing action/filter metadata

**Step 3: Run targeted tests**

Confirm enriched fields exist for normal models and custom aliases.

### Task 5: Add company-aware sorting

**Files:**
- Modify: `open_webui/utils/models.py`
- Possibly modify: `open_webui/main.py` if sorting must happen after user-visible filters are applied

**Step 1: Define the sort rule**

Within a selected company category:
- curated popularity rank ascending
- name ascending

Without selected company:
- preserve current ordering semantics as much as possible

**Step 2: Decide filter input**

Use the existing tag/company filter mechanism already available in the UI payload path.

**Step 3: Run tests**

Add and pass tests for selected-company ordering.

### Task 6: Verify API behavior with the live Featherless setup

**Files:**
- No code changes required

**Step 1: Refresh the live model list**

Run: `curl` against `/api/models?refresh=true` on the local Open WebUI instance.

**Step 2: Validate deepseek company tagging**

Check that:
- `deepseek-chat` is present
- it includes `company` metadata
- it carries a `company:deepseek-ai` tag if mapped that way

**Step 3: Validate sort order**

Confirm that within the DeepSeek company grouping, the expected top-priority model is first.

### Task 7: Regression verification

**Files:**
- Existing tests covering model APIs

**Step 1: Run the relevant backend tests**

Run the smallest reliable test subset first, then broaden if needed.

**Step 2: Smoke-test the live UI behavior**

Verify:
- model picker still loads
- `deepseek-chat` remains selectable
- switching models still works

**Step 3: Document any remaining limitations**

Specifically note that "most downloaded" is implemented via curated popularity because Featherless does not expose download counts.

### Task 8: Commit cleanly

**Files:**
- Include only the Open WebUI customization files and docs

**Step 1: Review diff**

Check that only intended files changed.

**Step 2: Commit**

Use a message like:

```bash
git commit -m "feat: add company-based model ranking"
```
