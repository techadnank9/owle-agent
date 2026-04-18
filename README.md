# Owle AI Revenue Agent

Closed-loop revenue agent that helps Owle AI generate qualified pilot meetings with skilled nursing facilities (60+ patient beds). Covers account selection through meeting booking — scoring accounts, mapping stakeholders, drafting outreach, classifying replies, and booking meetings.

## Architecture

```
Next.js Dashboard (TS)
      │
   FastAPI (Python)
      │
  LangGraph Agent Graph
  ┌─────────────────────────────────────────────┐
  │ account_selector → stakeholder_mapper       │
  │   → strategy_decider → outreach_generator   │
  │   → [HITL pause] → reply_classifier         │
  │   → meeting_booker → learning_updater       │
  └─────────────────────────────────────────────┘
      │
  Supabase (state + audit log)   Claude API   Gmail API
```

## Stack

| Layer | Tech |
|---|---|
| Agent framework | LangGraph 0.2 |
| LLM | Claude claude-sonnet-4-6 (Anthropic SDK) |
| API | FastAPI |
| Email | Gmail API |
| LinkedIn | Human-in-the-loop (agent drafts, human sends) |
| DB / state | Supabase (Postgres) |
| LangGraph checkpointer | `langgraph-checkpoint-postgres` |
| Observability | LangSmith |
| Frontend | Next.js 14 + shadcn/ui |
| Deployment | Render (backend) + Vercel (frontend) |

## Project Structure

```
owle-agent/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── config.py        # Settings from .env
│   │   ├── db.py            # LangGraph checkpointer
│   │   ├── claude.py        # Anthropic client + prompt caching
│   │   ├── agents/
│   │   │   ├── state.py     # AgentState TypedDict
│   │   │   ├── graph.py     # LangGraph graph
│   │   │   └── nodes/       # One file per agent node
│   │   └── routers/         # FastAPI routers
│   ├── supabase/migrations/ # SQL schema
│   └── tests/
├── frontend/                # Next.js dashboard (Plan 4)
└── docs/
    └── superpowers/
        ├── specs/           # Design docs
        └── plans/           # Implementation plans
```

## Setup

### 1. Supabase schema

In Supabase SQL Editor, run `backend/supabase/migrations/001_initial.sql`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# fill in ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY, DATABASE_URL
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### 3. Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `DATABASE_URL` | Postgres connection string (for LangGraph checkpointer) |
| `LANGSMITH_API_KEY` | Optional — enables LangSmith tracing |

### 4. Tests

```bash
cd backend
pytest tests/ -v
```

### 5. Frontend

```bash
cd frontend
cp .env.local.example .env.local  # fill in Supabase URL + key
npm install
npm run dev
```

Open `http://localhost:3000`

| Page | Path | What it does |
|---|---|---|
| Accounts | `/accounts` | Upload CSV, view scored accounts |
| Queue | `/queue` | Approve/reject/send outreach drafts |
| Inbox | `/inbox` | View classified replies + response drafts |
| Detail | `/accounts/:id` | Account scores + full audit log |

## Agent Nodes

| Node | What it does |
|---|---|
| `account_selector` | Scores accounts against ICP, ranks by pilot likelihood |
| `stakeholder_mapper` | Identifies buyer roles (COO, VP Ops, Admin, DON) |
| `strategy_decider` | Picks channel, angle, founder vs agent-led |
| `outreach_generator` | Drafts email + LinkedIn copy |
| **HITL checkpoint** | Human approves/edits before send |
| `reply_classifier` | Classifies inbound replies, drafts response |
| `meeting_booker` | Converts interest into confirmed meeting |
| `learning_updater` | Logs outcome signals for prioritization improvement |

## API Endpoints

```
GET  /health
GET  /accounts/
POST /accounts/upload
GET  /outreach/queue
POST /outreach/{id}/approve
POST /webhooks/gmail
```

## Implementation Plans

- **Plan 1**: Foundation — scaffold, schema, LangGraph skeleton ✅
- **Plan 2**: Agent pipeline — real Claude calls in all nodes ✅
- **Plan 3**: Gmail integration — send + reply webhook ✅
- **Plan 4**: Frontend dashboard — Next.js, HITL approval UI, inbox ✅
