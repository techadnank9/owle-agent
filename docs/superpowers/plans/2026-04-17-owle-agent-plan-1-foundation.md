# Owle AI Revenue Agent — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full project structure, apply Supabase schema, wire FastAPI + LangGraph skeleton, and prove end-to-end graph execution with a dummy account.

**Architecture:** Python FastAPI backend hosts a LangGraph agent graph with PostgresSaver checkpointer backed by Supabase. Claude claude-sonnet-4-6 with prompt caching is the LLM for all nodes. The graph is built but nodes are stubs — subsequent plans fill them in.

**Tech Stack:** Python 3.11+, FastAPI, LangGraph 0.2, langgraph-checkpoint-postgres, Anthropic SDK, Supabase (Postgres), Pydantic v2, pytest, pytest-asyncio

---

## File Map

```
owle-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app + lifespan
│   │   ├── config.py                # Pydantic settings from .env
│   │   ├── db.py                    # PostgresSaver init
│   │   ├── claude.py                # Anthropic client + cached system prompt
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── state.py             # AgentState TypedDict
│   │   │   ├── graph.py             # build_graph() — wires all nodes
│   │   │   └── nodes/
│   │   │       ├── __init__.py
│   │   │       ├── account_selector.py      # stub
│   │   │       ├── stakeholder_mapper.py    # stub
│   │   │       ├── strategy_decider.py      # stub
│   │   │       ├── outreach_generator.py    # stub
│   │   │       ├── reply_classifier.py      # stub
│   │   │       ├── meeting_booker.py        # stub
│   │   │       └── learning_updater.py      # stub
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── accounts.py          # POST /accounts/upload, GET /accounts
│   │       ├── outreach.py          # GET /outreach/queue, POST /outreach/{id}/approve
│   │       └── webhooks.py          # POST /webhooks/gmail
│   ├── supabase/
│   │   └── migrations/
│   │       └── 001_initial.sql
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py              # FastAPI test client + settings override
│   │   ├── test_config.py
│   │   ├── test_health.py
│   │   └── test_graph_smoke.py
│   ├── pyproject.toml
│   ├── .env.example
│   └── render.yaml                  # Render deployment config
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-17-owle-ai-revenue-agent-design.md
```

---

## Task 1: Project scaffold

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: `backend/render.yaml`
- Create: all `__init__.py` files listed in file map

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p backend/app/agents/nodes
mkdir -p backend/app/routers
mkdir -p backend/supabase/migrations
mkdir -p backend/tests
touch backend/app/__init__.py
touch backend/app/agents/__init__.py
touch backend/app/agents/nodes/__init__.py
touch backend/app/routers/__init__.py
touch backend/tests/__init__.py
```

- [ ] **Step 2: Create `backend/pyproject.toml`**

```toml
[project]
name = "owle-agent"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111.0",
    "uvicorn[standard]>=0.29.0",
    "langgraph>=0.2.0",
    "langgraph-checkpoint-postgres>=1.0.0",
    "anthropic>=0.28.0",
    "supabase>=2.4.0",
    "psycopg[binary]>=3.1.0",
    "pydantic>=2.7.0",
    "pydantic-settings>=2.2.0",
    "google-auth>=2.29.0",
    "google-auth-oauthlib>=1.2.0",
    "google-api-python-client>=2.128.0",
    "apscheduler>=3.10.0",
    "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.2.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

- [ ] **Step 3: Create `backend/.env.example`**

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
LANGSMITH_API_KEY=
LANGCHAIN_TRACING_V2=false
```

- [ ] **Step 4: Create `backend/render.yaml`**

```yaml
services:
  - type: web
    name: owle-agent-api
    runtime: python
    buildCommand: pip install -e ".[dev]"
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: DATABASE_URL
        sync: false
```

- [ ] **Step 5: Install dependencies**

```bash
cd backend
pip install -e ".[dev]"
```

Expected: installs without errors.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: scaffold backend project structure"
```

---

## Task 2: Supabase schema migration

**Files:**
- Create: `backend/supabase/migrations/001_initial.sql`

- [ ] **Step 1: Write the migration file**

Create `backend/supabase/migrations/001_initial.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text,
  bed_count int,
  location text,
  raw_data jsonb DEFAULT '{}',
  icp_score numeric,
  priority_score numeric,
  status text DEFAULT 'new' CHECK (status IN ('new','in_outreach','replied','meeting_booked','paused','excluded')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  name text,
  title text,
  email text,
  linkedin_url text,
  source text CHECK (source IN ('verified','inferred')),
  confidence numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE outreach_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id),
  channel text CHECK (channel IN ('email','linkedin')),
  subject text,
  body text,
  sent_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','sent','failed')),
  gmail_thread_id text
);

CREATE TABLE replies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  outreach_action_id uuid REFERENCES outreach_actions(id),
  body text,
  received_at timestamptz DEFAULT now(),
  classification text CHECK (classification IN ('interested','not_now','referral','not_a_fit','unsubscribe','unclear')),
  confidence numeric,
  response_draft text
);

CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  contact_id uuid REFERENCES contacts(id),
  status text DEFAULT 'soft_interest' CHECK (status IN ('soft_interest','proposed','confirmed','cancelled')),
  proposed_times jsonb DEFAULT '[]',
  confirmed_at timestamptz,
  calendar_link text
);

CREATE TABLE agent_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  graph_thread_id text UNIQUE NOT NULL,
  current_node text,
  status text DEFAULT 'running' CHECK (status IN ('running','waiting_hitl','completed','failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  agent_run_id uuid REFERENCES agent_runs(id),
  node text NOT NULL,
  action text NOT NULL,
  rationale text,
  verified_facts jsonb DEFAULT '{}',
  inferred_assumptions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE outcome_signals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  message_angle text,
  persona text,
  channel text,
  reply_received boolean DEFAULT false,
  meeting_booked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- auto-update updated_at on agent_runs
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_runs_updated_at
  BEFORE UPDATE ON agent_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Go to Supabase project → SQL Editor → paste contents of `001_initial.sql` → Run.

Expected: all 8 tables created, no errors.

- [ ] **Step 3: Verify tables exist**

In Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output includes: `accounts`, `agent_runs`, `audit_log`, `contacts`, `meetings`, `outcome_signals`, `outreach_actions`, `replies`

- [ ] **Step 4: Commit**

```bash
git add backend/supabase/
git commit -m "feat: add initial Supabase schema migration"
```

---

## Task 3: Config + DB layer

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/app/db.py`
- Create: `backend/tests/test_config.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_config.py`:

```python
import os
import pytest
from unittest.mock import patch


def test_settings_load_from_env():
    env = {
        "ANTHROPIC_API_KEY": "sk-ant-test",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/testdb",
    }
    with patch.dict(os.environ, env):
        from app.config import Settings
        s = Settings()
        assert s.anthropic_api_key == "sk-ant-test"
        assert s.supabase_url == "https://test.supabase.co"
        assert s.database_url == "postgresql://user:pass@localhost:5432/testdb"


def test_settings_missing_required_raises():
    with patch.dict(os.environ, {}, clear=True):
        from app.config import Settings
        with pytest.raises(Exception):
            Settings()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/test_config.py -v
```

Expected: FAIL with `ModuleNotFoundError` or `ImportError` — `app.config` doesn't exist yet.

- [ ] **Step 3: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    supabase_url: str
    supabase_key: str
    database_url: str
    langsmith_api_key: str = ""
    langchain_tracing_v2: bool = False

    model_config = {"env_file": ".env"}


settings = Settings()
```

- [ ] **Step 4: Create `backend/app/db.py`**

```python
from langgraph.checkpoint.postgres import PostgresSaver


def init_checkpointer(database_url: str) -> PostgresSaver:
    checkpointer = PostgresSaver.from_conn_string(database_url)
    checkpointer.setup()
    return checkpointer
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend
pytest tests/test_config.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/config.py backend/app/db.py backend/tests/test_config.py
git commit -m "feat: add config and DB checkpointer layer"
```

---

## Task 4: Claude API client

**Files:**
- Create: `backend/app/claude.py`

- [ ] **Step 1: Create `backend/app/claude.py`**

```python
import anthropic
from .config import settings

_client: anthropic.Anthropic | None = None

SYSTEM_PROMPT = """You are a revenue agent for Owle AI, which sells operational AI tools \
to skilled nursing facilities (SNFs) with 60+ patient beds.

Your job: identify high-fit accounts, map stakeholders, craft personalized outreach, \
and convert interest into booked pilot meetings.

Rules:
- Always distinguish verified facts (from provided data) from inferred assumptions (your reasoning).
- Never hallucinate contacts, titles, email addresses, or company facts.
- When uncertain, flag it explicitly and recommend human review.
- Be concise, credible, and specific — not generic."""


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def call_claude(
    user_prompt: str,
    tools: list | None = None,
    max_tokens: int = 2048,
) -> anthropic.types.Message:
    kwargs: dict = {
        "model": "claude-sonnet-4-6",
        "max_tokens": max_tokens,
        "system": [
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        "messages": [{"role": "user", "content": user_prompt}],
    }
    if tools:
        kwargs["tools"] = tools
    return get_client().messages.create(**kwargs)
```

- [ ] **Step 2: Verify Claude client works (manual smoke test)**

Create a temporary file `backend/smoke_claude.py`:

```python
import os
os.environ["ANTHROPIC_API_KEY"] = "YOUR_KEY"
os.environ["SUPABASE_URL"] = "https://placeholder.supabase.co"
os.environ["SUPABASE_KEY"] = "placeholder"
os.environ["DATABASE_URL"] = "postgresql://placeholder"

from app.claude import call_claude
msg = call_claude("Say 'hello world' and nothing else.")
print(msg.content[0].text)
print("Cache tokens:", msg.usage.cache_creation_input_tokens)
```

Run: `cd backend && python smoke_claude.py`
Expected: prints "hello world", cache_creation_input_tokens > 0

Delete `backend/smoke_claude.py` after.

- [ ] **Step 3: Commit**

```bash
git add backend/app/claude.py
git commit -m "feat: add Claude API client with prompt caching"
```

---

## Task 5: AgentState model

**Files:**
- Create: `backend/app/agents/state.py`

- [ ] **Step 1: Create `backend/app/agents/state.py`**

```python
from typing import TypedDict


class AgentState(TypedDict):
    # Input
    account_id: str
    account_data: dict                   # raw account dict from CSV/DB

    # account_selector output
    icp_score: float | None
    priority_score: float | None
    icp_rationale: str | None
    verified_facts: dict                 # facts confirmed from data
    inferred_assumptions: dict           # agent's inferences

    # stakeholder_mapper output
    contacts: list[dict]                 # [{name, title, email, linkedin_url, source, confidence}]

    # strategy_decider output
    strategy: dict | None                # {channel, angle, lead_type, action}
    # action: 'pursue' | 'pause' | 'escalate'
    # lead_type: 'founder_led' | 'agent_led'

    # outreach_generator output
    email_draft: str | None
    email_subject: str | None
    linkedin_draft: str | None

    # HITL
    hitl_approved: bool

    # reply_classifier output
    reply_text: str | None
    reply_classification: str | None     # interested|not_now|referral|not_a_fit|unsubscribe|unclear
    reply_confidence: float | None
    response_draft: str | None

    # meeting_booker output
    meeting_status: str | None           # soft_interest|proposed|confirmed

    # audit
    audit_entries: list[dict]            # [{node, action, rationale, verified_facts, inferred_assumptions}]
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/agents/state.py
git commit -m "feat: define AgentState TypedDict"
```

---

## Task 6: LangGraph graph + stub nodes

**Files:**
- Create: `backend/app/agents/graph.py`
- Create: `backend/app/agents/nodes/account_selector.py` (stub)
- Create: `backend/app/agents/nodes/stakeholder_mapper.py` (stub)
- Create: `backend/app/agents/nodes/strategy_decider.py` (stub)
- Create: `backend/app/agents/nodes/outreach_generator.py` (stub)
- Create: `backend/app/agents/nodes/reply_classifier.py` (stub)
- Create: `backend/app/agents/nodes/meeting_booker.py` (stub)
- Create: `backend/app/agents/nodes/learning_updater.py` (stub)

- [ ] **Step 1: Create stub nodes**

Each stub returns state unchanged with a log entry. Repeat this pattern for all 7 nodes.

Create `backend/app/agents/nodes/account_selector.py`:
```python
from ..state import AgentState


def account_selector_node(state: AgentState) -> dict:
    entry = {
        "node": "account_selector",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "icp_score": 0.0,
        "priority_score": 0.0,
        "icp_rationale": "stub",
        "verified_facts": {},
        "inferred_assumptions": {},
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

Create `backend/app/agents/nodes/stakeholder_mapper.py`:
```python
from ..state import AgentState


def stakeholder_mapper_node(state: AgentState) -> dict:
    entry = {
        "node": "stakeholder_mapper",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "contacts": [],
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

Create `backend/app/agents/nodes/strategy_decider.py`:
```python
from ..state import AgentState


def strategy_decider_node(state: AgentState) -> dict:
    entry = {
        "node": "strategy_decider",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "strategy": {"channel": "email", "angle": "stub", "lead_type": "agent_led", "action": "pursue"},
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

Create `backend/app/agents/nodes/outreach_generator.py`:
```python
from ..state import AgentState


def outreach_generator_node(state: AgentState) -> dict:
    entry = {
        "node": "outreach_generator",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "email_draft": "stub email body",
        "email_subject": "stub subject",
        "linkedin_draft": "stub linkedin message",
        "hitl_approved": False,
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

Create `backend/app/agents/nodes/reply_classifier.py`:
```python
from ..state import AgentState


def reply_classifier_node(state: AgentState) -> dict:
    entry = {
        "node": "reply_classifier",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "reply_classification": "unclear",
        "reply_confidence": 0.0,
        "response_draft": "stub response",
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

Create `backend/app/agents/nodes/meeting_booker.py`:
```python
from ..state import AgentState


def meeting_booker_node(state: AgentState) -> dict:
    entry = {
        "node": "meeting_booker",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "meeting_status": "soft_interest",
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

Create `backend/app/agents/nodes/learning_updater.py`:
```python
from ..state import AgentState


def learning_updater_node(state: AgentState) -> dict:
    entry = {
        "node": "learning_updater",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

- [ ] **Step 2: Create `backend/app/agents/graph.py`**

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver

from .state import AgentState
from .nodes.account_selector import account_selector_node
from .nodes.stakeholder_mapper import stakeholder_mapper_node
from .nodes.strategy_decider import strategy_decider_node
from .nodes.outreach_generator import outreach_generator_node
from .nodes.reply_classifier import reply_classifier_node
from .nodes.meeting_booker import meeting_booker_node
from .nodes.learning_updater import learning_updater_node


def build_graph(checkpointer: PostgresSaver):
    g = StateGraph(AgentState)

    g.add_node("account_selector", account_selector_node)
    g.add_node("stakeholder_mapper", stakeholder_mapper_node)
    g.add_node("strategy_decider", strategy_decider_node)
    g.add_node("outreach_generator", outreach_generator_node)
    g.add_node("reply_classifier", reply_classifier_node)
    g.add_node("meeting_booker", meeting_booker_node)
    g.add_node("learning_updater", learning_updater_node)

    g.set_entry_point("account_selector")
    g.add_edge("account_selector", "stakeholder_mapper")
    g.add_edge("stakeholder_mapper", "strategy_decider")
    g.add_edge("strategy_decider", "outreach_generator")
    # Graph pauses here — HITL approval resumes it externally
    g.add_edge("outreach_generator", END)

    # Reply flow — triggered separately when a reply is received
    g.add_edge("reply_classifier", "meeting_booker")
    g.add_edge("meeting_booker", "learning_updater")
    g.add_edge("learning_updater", END)

    return g.compile(
        checkpointer=checkpointer,
        interrupt_after=["outreach_generator"],
    )
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/agents/
git commit -m "feat: add LangGraph graph skeleton with stub nodes"
```

---

## Task 7: FastAPI app

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/routers/accounts.py` (stub)
- Create: `backend/app/routers/outreach.py` (stub)
- Create: `backend/app/routers/webhooks.py` (stub)
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_health.py`:

```python
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_settings(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "test-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/test")


@pytest.mark.asyncio
async def test_health_returns_ok(mock_settings):
    with patch("app.db.init_checkpointer", return_value=MagicMock()):
        from app.main import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/test_health.py -v
```

Expected: FAIL — `app.main` not found.

- [ ] **Step 3: Create stub routers**

Create `backend/app/routers/accounts.py`:
```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def list_accounts():
    return []


@router.post("/upload")
def upload_accounts():
    return {"status": "not implemented"}
```

Create `backend/app/routers/outreach.py`:
```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/queue")
def get_queue():
    return []


@router.post("/{outreach_id}/approve")
def approve_outreach(outreach_id: str):
    return {"status": "not implemented"}
```

Create `backend/app/routers/webhooks.py`:
```python
from fastapi import APIRouter, Request

router = APIRouter()


@router.post("/gmail")
async def gmail_webhook(request: Request):
    return {"status": "not implemented"}
```

- [ ] **Step 4: Create `backend/app/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .config import settings
from .db import init_checkpointer
from .routers import accounts, outreach, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.checkpointer = init_checkpointer(settings.database_url)
    yield


app = FastAPI(title="Owle Agent API", lifespan=lifespan)

app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(outreach.router, prefix="/outreach", tags=["outreach"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend
pytest tests/test_health.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/app/routers/ backend/tests/test_health.py
git commit -m "feat: add FastAPI app with stub routers and health endpoint"
```

---

## Task 8: Smoke test — graph executes end-to-end

**Files:**
- Create: `backend/tests/test_graph_smoke.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_graph_smoke.py`:

```python
import pytest
from unittest.mock import MagicMock, patch


def make_mock_checkpointer():
    cp = MagicMock()
    cp.get.return_value = None
    cp.put.return_value = None
    cp.list.return_value = []
    return cp


def test_graph_builds_without_error():
    checkpointer = make_mock_checkpointer()
    with patch("langgraph.checkpoint.postgres.PostgresSaver", return_value=checkpointer):
        from app.agents.graph import build_graph
        graph = build_graph(checkpointer)
        assert graph is not None


def test_graph_runs_through_outreach_generator():
    checkpointer = make_mock_checkpointer()
    # LangGraph needs a real MemorySaver for unit tests (no DB)
    from langgraph.checkpoint.memory import MemorySaver
    from app.agents.graph import build_graph

    graph = build_graph(MemorySaver())
    initial_state = {
        "account_id": "test-account-001",
        "account_data": {
            "name": "Sunrise Skilled Nursing",
            "bed_count": 120,
            "location": "Dallas, TX",
            "type": "skilled_nursing_facility",
        },
        "icp_score": None,
        "priority_score": None,
        "icp_rationale": None,
        "verified_facts": {},
        "inferred_assumptions": {},
        "contacts": [],
        "strategy": None,
        "email_draft": None,
        "email_subject": None,
        "linkedin_draft": None,
        "hitl_approved": False,
        "reply_text": None,
        "reply_classification": None,
        "reply_confidence": None,
        "response_draft": None,
        "meeting_status": None,
        "audit_entries": [],
    }
    config = {"configurable": {"thread_id": "test-thread-001"}}

    # Run until HITL interrupt (after outreach_generator)
    result = graph.invoke(initial_state, config)

    assert result["icp_score"] == 0.0          # stub value
    assert result["contacts"] == []             # stub value
    assert result["email_draft"] == "stub email body"
    assert len(result["audit_entries"]) == 4   # one per node: selector, mapper, decider, generator
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/test_graph_smoke.py -v
```

Expected: FAIL — import errors or assertion errors.

- [ ] **Step 3: Update `build_graph` to also accept MemorySaver for tests**

Edit `backend/app/agents/graph.py` — change the type hint to accept any checkpointer:

```python
from langgraph.graph import StateGraph, END

from .state import AgentState
from .nodes.account_selector import account_selector_node
from .nodes.stakeholder_mapper import stakeholder_mapper_node
from .nodes.strategy_decider import strategy_decider_node
from .nodes.outreach_generator import outreach_generator_node
from .nodes.reply_classifier import reply_classifier_node
from .nodes.meeting_booker import meeting_booker_node
from .nodes.learning_updater import learning_updater_node


def build_graph(checkpointer):
    g = StateGraph(AgentState)

    g.add_node("account_selector", account_selector_node)
    g.add_node("stakeholder_mapper", stakeholder_mapper_node)
    g.add_node("strategy_decider", strategy_decider_node)
    g.add_node("outreach_generator", outreach_generator_node)
    g.add_node("reply_classifier", reply_classifier_node)
    g.add_node("meeting_booker", meeting_booker_node)
    g.add_node("learning_updater", learning_updater_node)

    g.set_entry_point("account_selector")
    g.add_edge("account_selector", "stakeholder_mapper")
    g.add_edge("stakeholder_mapper", "strategy_decider")
    g.add_edge("strategy_decider", "outreach_generator")
    g.add_edge("outreach_generator", END)

    g.add_edge("reply_classifier", "meeting_booker")
    g.add_edge("meeting_booker", "learning_updater")
    g.add_edge("learning_updater", END)

    return g.compile(
        checkpointer=checkpointer,
        interrupt_after=["outreach_generator"],
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
pytest tests/test_graph_smoke.py -v
```

Expected: PASS — both tests green.

- [ ] **Step 5: Run full test suite**

```bash
cd backend
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/agents/graph.py backend/tests/test_graph_smoke.py
git commit -m "feat: verify graph executes end-to-end with stub nodes"
```

---

## Task 9: Verify server starts

- [ ] **Step 1: Copy env file and fill in real values**

```bash
cd backend
cp .env.example .env
# Edit .env with your real ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY, DATABASE_URL
```

- [ ] **Step 2: Start server**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Expected: server starts, no errors, output includes:
```
INFO:     Application startup complete.
```

- [ ] **Step 3: Hit health endpoint**

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Check OpenAPI docs load**

Open browser: `http://localhost:8000/docs`
Expected: FastAPI Swagger UI loads, shows `/health`, `/accounts/`, `/outreach/queue`, `/webhooks/gmail` endpoints.

---

## What's Next

- **Plan 2:** Agent pipeline — implement all 8 LangGraph nodes with real Claude calls, structured Pydantic outputs, audit log writes to Supabase
- **Plan 3:** Gmail integration — OAuth setup, send email, poll/webhook for replies
- **Plan 4:** Frontend dashboard — Next.js scaffold, account list, HITL approval UI, reply inbox
