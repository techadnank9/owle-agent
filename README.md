# Owle AI Revenue Agent

Owle is a closed-loop AI outreach agent built for a single vertical: **skilled nursing facilities (SNFs)**. It takes a facility name, scores it for fit and urgency, finds the right decision-maker, drafts a personalised email, waits for your approval, sends it via Gmail, classifies the reply, and books a pilot meeting — all automatically.

**What it replaces:** manually researching SNFs → finding contacts → writing emails → following up → scheduling calls. That cycle previously took 2–3 hours per account. Owle does it in under a minute per account, at scale.

**Current target:** SNFs with 60+ patient beds in the US. ICP signals: high nurse turnover, low CMS star rating, recent penalties. These facilities are actively struggling with staffing — exactly the problem Owle solves.

---

## How the pipeline works

```
User imports SNFs (CMS search or CSV)
        │
        ▼
account_selector     — ICP fit score (0–100) + Priority score (0–100)
        │                 Sources: CMS Care Compare, account data
        ▼
stakeholder_mapper   — Finds decision-makers (Administrator, DON, CFO, IT Dir)
        │                 Sources: Claude inference + web context
        ▼
web_enricher         — Pulls facility website, recent news, key context
        │                 Sources: Tavily search API
        ▼
contact_enricher     — Gets email + LinkedIn URL for each contact
        │                 Sources: Hunter.io → Apollo.io → Apify (waterfall)
        ▼
outreach_generator   — Writes personalised email + LinkedIn message
        │                 Uses: facility CMS data, contact role, pain signals
        ▼
   ⏸ HITL PAUSE      — You review in Approval Queue. Nothing sends without approval.
        │
        ▼  (approved)
email_sender         — Sends via Gmail API (your own account, your domain)
        │
        ▼  (reply received via Gmail webhook)
reply_classifier     — Classifies: interested / not_interested / question / OOO / unsubscribe
        │
        ▼  (interested)
meeting_booker       — Drafts follow-up proposing 30-min pilot call
        │
        ▼
learning_updater     — Writes structured audit log, updates account status
```

---

## Architecture

```
Next.js Dashboard (TypeScript / Vercel)
        │
     FastAPI (Python / Render)
        │
  LangGraph Agent Graph (LangGraph 0.2)
        │
  ┌─────────────────────────────────────────────────────────┐
  │  account_selector → stakeholder_mapper → web_enricher  │
  │  → outreach_generator → [HITL pause]                   │
  │  → reply_classifier → meeting_booker → learning_updater│
  └─────────────────────────────────────────────────────────┘
        │
  Supabase (Postgres — accounts, contacts, meetings, audit log)
  Claude API (claude-sonnet-4-6 — all AI reasoning)
  Gmail API (OAuth — send + receive via webhook)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent framework | LangGraph 0.2 |
| LLM | Claude claude-sonnet-4-6 (Anthropic SDK) |
| API server | FastAPI + Uvicorn |
| Email sending | Gmail API (OAuth2) |
| LinkedIn | Human-in-the-loop — agent drafts, you send manually |
| Database | Supabase (Postgres) |
| LangGraph checkpointer | `langgraph-checkpoint-postgres` |
| Observability | LangSmith |
| Frontend | Next.js 14 + Tailwind CSS |
| Deployment | Render (backend) + Vercel (frontend) |

### External data sources

| Source | What it provides | Plan needed |
|---|---|---|
| CMS Care Compare | 15,000+ SNFs — beds, star rating, turnover %, penalties | Free (public API) |
| Hunter.io | Email finder by domain — 2,000 searches/mo | Outreach Platform Starter ($49/mo) |
| Apollo.io | Contact database (275M) — emails + LinkedIn URLs | Basic ($49/mo annual) |
| Apify | Fallback email scraping — easy-email-finder actor | Starter ($29/mo) |
| Tavily | Web search for facility context | Free tier (1,000/mo) |

---

## Project Structure

```
owle-agent/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── db.py                # Supabase client + LangGraph checkpointer
│   │   ├── claude.py            # Anthropic client + prompt caching
│   │   ├── gmail_client.py      # Gmail send + OAuth token refresh
│   │   ├── calendar_client.py   # Google Calendar integration
│   │   ├── hunter_client.py     # Hunter.io email search
│   │   ├── apollo_client.py     # Apollo.io contact enrichment
│   │   ├── agents/
│   │   │   ├── state.py         # AgentState TypedDict
│   │   │   ├── graph.py         # LangGraph graph definition
│   │   │   └── nodes/
│   │   │       ├── account_selector.py
│   │   │       ├── stakeholder_mapper.py
│   │   │       ├── web_enricher.py
│   │   │       ├── outreach_generator.py
│   │   │       ├── reply_classifier.py
│   │   │       ├── meeting_booker.py
│   │   │       └── learning_updater.py
│   │   └── routers/
│   │       ├── accounts.py      # Account CRUD + CSV upload
│   │       ├── outreach.py      # Approval queue
│   │       ├── inbox.py         # Reply inbox
│   │       ├── meetings.py      # Meeting management
│   │       └── webhooks.py      # Gmail push notification handler
│   ├── supabase/migrations/     # SQL schema
│   └── tests/
├── frontend/
│   ├── app/(app)/
│   │   ├── accounts/            # Account list + CMS search
│   │   ├── accounts/[id]/       # Account detail + audit log
│   │   ├── search/              # CMS SNF search
│   │   ├── inbox/               # Reply inbox
│   │   ├── meetings/            # Meeting calendar + list
│   │   ├── pipeline/            # Deal pipeline board
│   │   ├── platforms/           # Tool pricing reference
│   │   └── how-it-works/        # This pipeline explained
│   └── components/
└── docs/
```

---

## Setup

### 1. Supabase schema

Run in Supabase SQL Editor:
```bash
backend/supabase/migrations/001_initial.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in all environment variables (see table below)
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### 3. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key — used for all Claude calls |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase anon key (or service role key) |
| `DATABASE_URL` | ✅ | Postgres connection string for LangGraph checkpointer |
| `GMAIL_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | ✅ | Gmail OAuth refresh token |
| `GMAIL_USER_EMAIL` | ✅ | Gmail address to send from |
| `HUNTER_API_KEY` | ✅ | Hunter.io API key (Outreach Platform Starter, $49/mo) |
| `APOLLO_API_KEY` | ✅ | Apollo.io API key (Basic plan, $49/mo annual) |
| `APIFY_API_KEY` | ✅ | Apify API key (Starter, $29/mo) |
| `TAVILY_API_KEY` | ✅ | Tavily web search API key (free tier) |
| `LANGSMITH_API_KEY` | Optional | Enables LangSmith tracing for agent runs |
| `GOOGLE_WEBHOOK_URL` | Optional | Public URL for Gmail push notifications |

> **Cost to run (Phase 1):** Render $7 + Hunter $49 + Anthropic ~$10–20 = **~$66–76/mo**

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open `http://localhost:3000`

### 5. Tests

```bash
cd backend
pytest tests/ -v
```

---

## Dashboard Pages

| Page | Route | What it does |
|---|---|---|
| Accounts | `/accounts` | All imported accounts — filter by status, trigger agent run |
| CMS Search | `/search` | Search 15,000+ SNFs from CMS Care Compare, import in bulk |
| Account Detail | `/accounts/:id` | Scores, contacts, outreach drafts, full audit log |
| Approval Queue | `/accounts` (queue tab) | Review AI-drafted emails before sending — approve or reject |
| Inbox | `/inbox` | Classified replies + AI-drafted response suggestions |
| Meetings | `/meetings` | Calendar view + list of all meetings by status |
| Deal Pipeline | `/pipeline` | Kanban board — new → contacted → meeting → won/lost |
| Platforms | `/platforms` | Pricing reference for Hunter, Apollo, Apify, and other tools |
| How It Works | `/how-it-works` | Full pipeline walkthrough |

---

## Agent Nodes

| Node | Input | Output |
|---|---|---|
| `account_selector` | Raw account data + CMS signals | ICP score, Priority score, recommendation (pursue/pause/exclude) |
| `stakeholder_mapper` | Account name + location | Contacts list with role, name, email guess |
| `web_enricher` | Account name + contacts | Website copy, recent news, facility context for personalisation |
| `outreach_generator` | Account + contacts + web context | Email subject + body, LinkedIn message draft |
| `reply_classifier` | Raw reply email text | Classification label + confidence + suggested response draft |
| `meeting_booker` | Interested reply + account context | Follow-up email proposing pilot call |
| `learning_updater` | Full run state | Structured audit log entry in Supabase |

---

## API Endpoints

```
GET   /health
GET   /accounts/
POST  /accounts/upload
GET   /accounts/{id}
POST  /accounts/{id}/run-agent
GET   /outreach/queue
POST  /outreach/{id}/approve
POST  /outreach/{id}/reject
GET   /inbox/
GET   /meetings/
POST  /meetings/{id}/update
GET   /audit-log/{account_id}
POST  /webhooks/gmail
```

---

## Implementation Status

- **Plan 1** — Foundation: scaffold, schema, LangGraph skeleton ✅
- **Plan 2** — Agent pipeline: real Claude calls in all nodes ✅
- **Plan 3** — Gmail integration: send + reply webhook ✅
- **Plan 4** — Frontend dashboard: Next.js, HITL approval UI, inbox ✅
- **Plan 5** — CMS search: priority-scored SNF search from CMS data ✅
- **Plan 6** — Meetings calendar + deal pipeline ✅
