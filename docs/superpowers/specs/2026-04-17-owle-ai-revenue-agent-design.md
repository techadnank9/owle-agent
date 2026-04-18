# Owle AI Closed-Loop Revenue Agent — Design Spec

**Date:** 2026-04-17
**Status:** Approved

---

## 1. Purpose

Build a closed-loop revenue agent that helps Owle AI generate qualified pilot meetings with skilled nursing facilities (SNFs) with 60+ patient beds. The agent covers account selection through meeting booking — making decisions, taking actions, adapting based on responses, and escalating to a human when appropriate.

Success metric: booked pilot meetings, not message volume.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Dashboard (TS)                │
│  Account List │ Outreach Queue │ Reply Inbox │ Analytics │
└──────────────────────┬──────────────────────────────────┘
                       │ REST / Supabase Realtime
┌──────────────────────▼──────────────────────────────────┐
│                   FastAPI (Python)                       │
│              Agent API + Webhook handlers                │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              LangGraph Agent Graph                       │
│                                                          │
│  [account_selector] → [stakeholder_mapper]               │
│         → [strategy_decider] → [outreach_generator]      │
│         → [HITL checkpoint] → [reply_classifier]         │
│         → [meeting_booker] → [learning_updater]          │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Supabase DB    Gmail API      Claude API
  (state/memory)  (send email)   (all LLM calls)
```

**Data flow:**
1. User uploads account CSV via dashboard
2. LangGraph pipeline: score → map → strategize → draft
3. HITL checkpoint — human approves/edits email + LinkedIn copy in dashboard
4. Gmail sends email; LinkedIn copy shown for manual send
5. Gmail webhook fires on reply → `reply_classifier` node runs
6. If interested → `meeting_booker` proposes times → human confirms
7. All actions logged to Supabase with rationale, verified facts, inferred assumptions

---

## 3. Tech Stack

### Python Backend
| Layer | Choice | Reason |
|---|---|---|
| Agent framework | LangGraph 0.2 | Stateful graph, native HITL `interrupt()`, Supabase checkpointer |
| LLM | Claude claude-sonnet-4-6 (Anthropic SDK) | Tool use, structured output, prompt caching |
| API | FastAPI | Async, webhook-friendly, auto OpenAPI docs |
| Email | Gmail API (`google-auth` + `googleapiclient`) | Founder sends from real account = better deliverability |
| Data validation | Pydantic v2 | Structured agent outputs, CRM JSON schema |
| Task queue | APScheduler | Follow-up scheduling, no Redis needed |

### TypeScript Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + API routes, Supabase integration |
| UI | shadcn/ui + Tailwind | Fast, professional dashboard components |
| State | Supabase Realtime | Live updates when agent takes action |
| Forms | React Hook Form + Zod | HITL approval forms |

### Infrastructure
| Layer | Choice | Reason |
|---|---|---|
| DB + Auth | Supabase (Postgres) | State, memory, audit log, realtime, auth |
| LangGraph state | `langgraph-checkpoint-postgres` | Durable graph state across runs |
| Observability | LangSmith | Full trace of every agent decision |
| Backend deployment | Render | Simple, fast, Docker-based |
| Frontend deployment | Vercel | Next.js native |

---

## 4. Data Model

```sql
-- Core entities
accounts (
  id uuid PRIMARY KEY,
  name text,
  type text,                    -- 'skilled_nursing_facility' etc
  bed_count int,
  location text,
  raw_data jsonb,               -- original CSV row
  icp_score numeric,            -- 0-100
  priority_score numeric,       -- 0-100
  status text,                  -- 'new'|'in_outreach'|'replied'|'meeting_booked'|'paused'|'excluded'
  created_at timestamptz
)

contacts (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  name text,
  title text,                   -- COO, VP Operations, Administrator, Director of Nursing
  email text,
  linkedin_url text,
  source text,                  -- 'verified'|'inferred'
  confidence numeric,
  created_at timestamptz
)

outreach_actions (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  contact_id uuid REFERENCES contacts,
  channel text,                 -- 'email'|'linkedin'
  subject text,
  body text,
  sent_at timestamptz,
  status text,                  -- 'draft'|'pending_approval'|'approved'|'sent'|'failed'
  gmail_thread_id text
)

replies (
  id uuid PRIMARY KEY,
  outreach_action_id uuid REFERENCES outreach_actions,
  body text,
  received_at timestamptz,
  classification text,          -- 'interested'|'not_now'|'referral'|'not_a_fit'|'unsubscribe'|'unclear'
  confidence numeric,
  response_draft text
)

meetings (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  contact_id uuid REFERENCES contacts,
  status text,                  -- 'soft_interest'|'proposed'|'confirmed'|'cancelled'
  proposed_times jsonb,
  confirmed_at timestamptz,
  calendar_link text
)

-- Agent state
agent_runs (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  graph_thread_id text,         -- links to LangGraph checkpoint
  current_node text,
  status text,                  -- 'running'|'waiting_hitl'|'completed'|'failed'
  created_at timestamptz,
  updated_at timestamptz
)

audit_log (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  agent_run_id uuid REFERENCES agent_runs,
  node text,
  action text,
  rationale text,
  verified_facts jsonb,         -- BRD constraint: separated from inferred
  inferred_assumptions jsonb,
  created_at timestamptz
)

-- Learning
outcome_signals (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  message_angle text,
  persona text,
  channel text,
  reply_received boolean,
  meeting_booked boolean,
  created_at timestamptz
)
```

---

## 5. Agent Modules (LangGraph Nodes)

**Graph:**
```
account_selector → stakeholder_mapper → strategy_decider → outreach_generator
                                                                   ↓
                                                           [HITL interrupt]
                                                                   ↓
                                                          reply_classifier → meeting_booker → learning_updater
```

| Node | Input | Claude does | Output |
|---|---|---|---|
| `account_selector` | raw account list | score ICP fit, rank by pilot likelihood, explain reasoning | scored + ranked accounts |
| `stakeholder_mapper` | account | infer buyer roles (COO/VP Ops/Admin/DON), flag verified vs inferred | contact map |
| `strategy_decider` | account + contacts | pick channel, angle, founder vs agent-led, pause/pursue/escalate | strategy object |
| `outreach_generator` | account + strategy | draft email + LinkedIn copy, personalized | message drafts |
| **HITL checkpoint** | drafts | — human approves/edits in dashboard | approved drafts |
| `reply_classifier` | reply text | classify intent, draft response | classification + response draft |
| `meeting_booker` | classified reply | detect meeting intent, propose times, confirm | meeting record |
| `learning_updater` | outcome | write signal, adjust weight recommendations | updated weights |

Every node outputs structured Pydantic model → logged to `audit_log` with rationale + verified/inferred split.

---

## 6. PRD — User Stories

| # | As a... | I want to... | So that... |
|---|---|---|---|
| 1 | founder | upload a CSV of SNF accounts | agent scores and ranks them automatically |
| 2 | founder | see why each account is high/low priority | I trust the ranking |
| 3 | founder | review + edit drafted emails before send | I control my voice |
| 4 | founder | copy LinkedIn message with one click | I send it manually without friction |
| 5 | founder | see all replies classified in inbox | I know what needs attention |
| 6 | founder | confirm a meeting from the dashboard | agent updates account state automatically |
| 7 | founder | see what's working (angle, persona, channel) | I improve outreach over time |

---

## 7. Success Metrics

- Qualified pilot meetings booked (primary)
- Reply rate by message angle / persona / channel
- Time from account upload → first outreach sent
- % of HITL approvals with no edits (proxy for draft quality)
- Audit log completeness (every action has rationale)

---

## 8. MVP Scope

**Build first:**
1. Account scoring + stakeholder mapping
2. Outreach draft generation + HITL approval UI
3. Gmail send + reply ingestion via webhook
4. Reply classification + response draft
5. Dashboard: account queue, outreach inbox, account detail view

**Stretch (post-MVP):**
- Meeting booking + Google Calendar integration
- Learning loop analytics dashboard
- A/B experiment framework for message variants
- Simulated prospect replies for offline testing
- Rollback / undo mechanisms

---

## 9. Rules and Constraints

- Never hallucinate contacts, titles, or company facts
- Always separate verified facts from inferred assumptions in `audit_log`
- Route ambiguous/sensitive replies to human review
- No duplicate outreach across channels
- Every action has an audit trail with rationale
- Handle missing/messy CSV data gracefully (log warnings, don't crash)

---

## 10. Tradeoffs and Limitations

| Decision | Tradeoff |
|---|---|
| LangGraph over custom orchestrator | More abstraction, less boilerplate, slightly harder to debug raw state |
| Gmail API over sales platform | Better deliverability, but no built-in sequence tooling |
| LinkedIn HITL (manual send) | Safer (no ToS risk), but breaks full automation loop |
| APScheduler over Redis/Celery | Simpler setup, not horizontally scalable |
| Supabase checkpointer | Ties LangGraph state to Supabase schema, but eliminates separate Redis/memory store |
