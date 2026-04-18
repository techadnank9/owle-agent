# Owle AI Revenue Agent — Plan 2: Agent Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all stub LangGraph nodes with real Claude API calls, wire Supabase persistence, and connect the accounts + outreach routers to the live pipeline.

**Architecture:** Each node calls Claude with a typed tool schema to get structured JSON output, writes to `audit_log`, and updates relevant Supabase tables. Two graphs: `outreach_graph` (account → drafts → HITL pause) and `reply_graph` (classify reply → book meeting → learn). Routers trigger graphs and expose HITL approval queue.

**Tech Stack:** LangGraph 0.2, Anthropic SDK (tool_use + prompt caching), Supabase Python client, FastAPI, Pydantic v2, pytest + unittest.mock

---

## File Map

```
backend/
├── app/
│   ├── supabase_client.py              # NEW — Supabase singleton + DB helpers
│   ├── agents/
│   │   ├── state.py                    # MODIFY — add agent_run_id field
│   │   ├── graph.py                    # MODIFY — conditional routing + split reply graph
│   │   └── nodes/
│   │       ├── account_selector.py     # REPLACE stub with real Claude call
│   │       ├── stakeholder_mapper.py   # REPLACE stub
│   │       ├── strategy_decider.py     # REPLACE stub
│   │       ├── outreach_generator.py   # REPLACE stub + writes to outreach_actions
│   │       ├── reply_classifier.py     # REPLACE stub
│   │       ├── meeting_booker.py       # REPLACE stub + writes to meetings
│   │       └── learning_updater.py     # REPLACE stub + writes to outcome_signals
│   └── routers/
│       ├── accounts.py                 # REPLACE stub — CSV upload + graph trigger
│       └── outreach.py                 # REPLACE stub — queue + approve + reject
└── tests/
    ├── test_supabase_client.py         # NEW
    ├── test_account_selector.py        # NEW
    ├── test_stakeholder_mapper.py      # NEW
    ├── test_strategy_decider.py        # NEW
    ├── test_outreach_generator.py      # NEW
    ├── test_reply_classifier.py        # NEW
    └── test_accounts_router.py         # NEW
```

---

## Task 1: Supabase client + update AgentState

**Files:**
- Create: `backend/app/supabase_client.py`
- Modify: `backend/app/agents/state.py`
- Create: `backend/tests/test_supabase_client.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_supabase_client.py`:

```python
import pytest
from unittest.mock import patch, MagicMock


def test_get_supabase_returns_singleton():
    mock_client = MagicMock()
    with patch("app.supabase_client.create_client", return_value=mock_client) as mock_create:
        from app.supabase_client import get_supabase
        c1 = get_supabase()
        c2 = get_supabase()
        assert c1 is c2
        mock_create.assert_called_once()


def test_write_audit_log_inserts_row():
    mock_client = MagicMock()
    mock_client.table.return_value.insert.return_value.execute.return_value = MagicMock()

    with patch("app.supabase_client._client", mock_client):
        from app.supabase_client import write_audit_log
        write_audit_log(
            account_id="acc-1",
            agent_run_id="run-1",
            node="account_selector",
            action="scored account",
            rationale="Large SNF",
            verified_facts={"bed_count": 120},
            inferred_assumptions={},
        )
        mock_client.table.assert_called_with("audit_log")


def test_update_account_calls_update():
    mock_client = MagicMock()
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    with patch("app.supabase_client._client", mock_client):
        from app.supabase_client import update_account
        update_account("acc-1", {"icp_score": 90.0})
        mock_client.table.assert_called_with("accounts")
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_supabase_client.py -v
```

Expected: FAIL — `app.supabase_client` not found.

- [ ] **Step 3: Create `backend/app/supabase_client.py`**

```python
from supabase import create_client, Client
from .config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


def write_audit_log(
    account_id: str,
    agent_run_id: str,
    node: str,
    action: str,
    rationale: str,
    verified_facts: dict,
    inferred_assumptions: dict,
) -> None:
    get_supabase().table("audit_log").insert({
        "account_id": account_id,
        "agent_run_id": agent_run_id,
        "node": node,
        "action": action,
        "rationale": rationale,
        "verified_facts": verified_facts,
        "inferred_assumptions": inferred_assumptions,
    }).execute()


def update_account(account_id: str, updates: dict) -> None:
    get_supabase().table("accounts").update(updates).eq("id", account_id).execute()


def upsert_contacts(contacts: list[dict]) -> None:
    if contacts:
        get_supabase().table("contacts").insert(contacts).execute()


def create_outreach_action(data: dict) -> dict:
    result = get_supabase().table("outreach_actions").insert(data).execute()
    return result.data[0]


def write_outcome_signal(data: dict) -> None:
    get_supabase().table("outcome_signals").insert(data).execute()
```

- [ ] **Step 4: Update `backend/app/agents/state.py` — add `agent_run_id`**

```python
from typing import TypedDict


class AgentState(TypedDict):
    # Metadata
    account_id: str
    agent_run_id: str
    account_data: dict

    # account_selector output
    icp_score: float | None
    priority_score: float | None
    icp_rationale: str | None
    verified_facts: dict
    inferred_assumptions: dict

    # stakeholder_mapper output
    contacts: list[dict]

    # strategy_decider output
    strategy: dict | None

    # outreach_generator output
    email_draft: str | None
    email_subject: str | None
    linkedin_draft: str | None

    # HITL
    hitl_approved: bool

    # reply_classifier output
    reply_text: str | None
    reply_classification: str | None
    reply_confidence: float | None
    response_draft: str | None

    # meeting_booker output
    meeting_status: str | None

    # audit
    audit_entries: list[dict]
```

- [ ] **Step 5: Run tests**

```bash
cd backend
pytest tests/test_supabase_client.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/supabase_client.py app/agents/state.py tests/test_supabase_client.py
git commit -m "feat: add Supabase client helpers and agent_run_id to state"
```

---

## Task 2: Update graph — conditional routing + reply graph

**Files:**
- Modify: `backend/app/agents/graph.py`

- [ ] **Step 1: Replace `backend/app/agents/graph.py`**

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


def _route_after_strategy(state: AgentState) -> str:
    action = (state.get("strategy") or {}).get("action", "pursue")
    return "outreach_generator" if action == "pursue" else END


def build_outreach_graph(checkpointer):
    g = StateGraph(AgentState)

    g.add_node("account_selector", account_selector_node)
    g.add_node("stakeholder_mapper", stakeholder_mapper_node)
    g.add_node("strategy_decider", strategy_decider_node)
    g.add_node("outreach_generator", outreach_generator_node)

    g.set_entry_point("account_selector")
    g.add_edge("account_selector", "stakeholder_mapper")
    g.add_edge("stakeholder_mapper", "strategy_decider")
    g.add_conditional_edges("strategy_decider", _route_after_strategy)
    g.add_edge("outreach_generator", END)

    return g.compile(
        checkpointer=checkpointer,
        interrupt_after=["outreach_generator"],
    )


def build_reply_graph(checkpointer):
    g = StateGraph(AgentState)

    g.add_node("reply_classifier", reply_classifier_node)
    g.add_node("meeting_booker", meeting_booker_node)
    g.add_node("learning_updater", learning_updater_node)

    g.set_entry_point("reply_classifier")
    g.add_edge("reply_classifier", "meeting_booker")
    g.add_edge("meeting_booker", "learning_updater")
    g.add_edge("learning_updater", END)

    return g.compile(checkpointer=checkpointer)


# Keep build_graph as alias for outreach graph (used by existing tests)
def build_graph(checkpointer):
    return build_outreach_graph(checkpointer)
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
cd backend
pytest tests/ -v
```

Expected: 5 passed (graph smoke test may need minor update — `build_graph` is still exported).

- [ ] **Step 3: Commit**

```bash
git add app/agents/graph.py
git commit -m "feat: split outreach and reply graphs, add conditional routing after strategy"
```

---

## Task 3: account_selector — real implementation

**Files:**
- Modify: `backend/app/agents/nodes/account_selector.py`
- Create: `backend/tests/test_account_selector.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_account_selector.py`:

```python
import pytest
from unittest.mock import patch, MagicMock


def make_claude_tool_response(tool_input: dict):
    mock_msg = MagicMock()
    mock_tool = MagicMock()
    mock_tool.type = "tool_use"
    mock_tool.input = tool_input
    mock_msg.content = [mock_tool]
    return mock_msg


BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF", "bed_count": "120", "type": "skilled_nursing_facility", "location": "Dallas, TX"},
    "audit_entries": [],
    "verified_facts": {},
    "inferred_assumptions": {},
}


def test_account_selector_returns_scores():
    tool_input = {
        "icp_score": 90.0,
        "priority_score": 85.0,
        "icp_rationale": "Large SNF, clear ICP fit",
        "verified_facts": {"bed_count": 120},
        "inferred_assumptions": {},
        "recommendation": "pursue",
    }
    with patch("app.agents.nodes.account_selector.call_claude", return_value=make_claude_tool_response(tool_input)), \
         patch("app.agents.nodes.account_selector.write_audit_log"), \
         patch("app.agents.nodes.account_selector.update_account"):
        from app.agents.nodes.account_selector import account_selector_node
        result = account_selector_node(BASE_STATE)
        assert result["icp_score"] == 90.0
        assert result["priority_score"] == 85.0
        assert result["icp_rationale"] == "Large SNF, clear ICP fit"
        assert len(result["audit_entries"]) == 1
        assert result["audit_entries"][0]["node"] == "account_selector"


def test_account_selector_fallback_when_no_tool_use():
    mock_msg = MagicMock()
    mock_msg.content = []  # no tool_use block
    with patch("app.agents.nodes.account_selector.call_claude", return_value=mock_msg), \
         patch("app.agents.nodes.account_selector.write_audit_log"), \
         patch("app.agents.nodes.account_selector.update_account"):
        from app.agents.nodes.account_selector import account_selector_node
        result = account_selector_node(BASE_STATE)
        assert result["icp_score"] == 50.0
        assert result["audit_entries"][0]["node"] == "account_selector"
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_account_selector.py -v
```

Expected: FAIL — stub returns 0.0, not 90.0.

- [ ] **Step 3: Replace `backend/app/agents/nodes/account_selector.py`**

```python
import json
from ..state import AgentState
from ...claude import call_claude
from ...supabase_client import write_audit_log, update_account

SCORE_ACCOUNT_TOOL = {
    "name": "score_account",
    "description": "Score a skilled nursing facility account against Owle AI's ICP",
    "input_schema": {
        "type": "object",
        "properties": {
            "icp_score": {
                "type": "number",
                "description": "ICP fit 0-100. 90-100=SNF 60+ beds. 60-89=SNF uncertain size. 30-59=marginal. 0-29=no fit."
            },
            "priority_score": {
                "type": "number",
                "description": "Outreach priority 0-100. Boost for large bed count, multi-facility, active pain signals."
            },
            "icp_rationale": {"type": "string"},
            "verified_facts": {"type": "object", "description": "Facts taken directly from the data. No inference."},
            "inferred_assumptions": {"type": "object", "description": "Inferences not in the data. Clearly labeled."},
            "recommendation": {
                "type": "string",
                "enum": ["pursue", "pause", "exclude"]
            }
        },
        "required": ["icp_score", "priority_score", "icp_rationale", "verified_facts", "inferred_assumptions", "recommendation"]
    }
}


def account_selector_node(state: AgentState) -> dict:
    account = state["account_data"]

    prompt = f"""Score this account against Owle AI's ideal customer profile.

ICP: Skilled nursing facilities (SNFs) with 60+ patient beds. Owle AI sells operational AI tools that reduce documentation burden, improve care coordination, and help with staffing workflows.

Account data:
{json.dumps(account, indent=2)}

Scoring guide:
- verified_facts: only what is explicitly in the data above
- inferred_assumptions: what you are inferring — be honest about uncertainty
- recommendation: pursue=proceed, pause=uncertain hold, exclude=clear mismatch

Call score_account."""

    msg = call_claude(prompt, tools=[SCORE_ACCOUNT_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    if not tool_use:
        result = {
            "icp_score": 50.0,
            "priority_score": 50.0,
            "icp_rationale": "Could not score — Claude did not return structured output",
            "verified_facts": {},
            "inferred_assumptions": {},
            "recommendation": "pause",
        }
    else:
        result = tool_use.input

    entry = {
        "node": "account_selector",
        "action": f"scored: icp={result['icp_score']}, priority={result['priority_score']}, rec={result['recommendation']}",
        "rationale": result["icp_rationale"],
        "verified_facts": result["verified_facts"],
        "inferred_assumptions": result["inferred_assumptions"],
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="account_selector",
        action=entry["action"],
        rationale=result["icp_rationale"],
        verified_facts=result["verified_facts"],
        inferred_assumptions=result["inferred_assumptions"],
    )

    status_map = {"pursue": "in_outreach", "pause": "paused", "exclude": "excluded"}
    update_account(state["account_id"], {
        "icp_score": result["icp_score"],
        "priority_score": result["priority_score"],
        "status": status_map.get(result["recommendation"], "paused"),
    })

    return {
        "icp_score": result["icp_score"],
        "priority_score": result["priority_score"],
        "icp_rationale": result["icp_rationale"],
        "verified_facts": result["verified_facts"],
        "inferred_assumptions": result["inferred_assumptions"],
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_account_selector.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/agents/nodes/account_selector.py tests/test_account_selector.py
git commit -m "feat: implement account_selector with real Claude scoring"
```

---

## Task 4: stakeholder_mapper — real implementation

**Files:**
- Modify: `backend/app/agents/nodes/stakeholder_mapper.py`
- Create: `backend/tests/test_stakeholder_mapper.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_stakeholder_mapper.py`:

```python
from unittest.mock import patch, MagicMock

BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF", "bed_count": "120"},
    "icp_score": 90.0,
    "verified_facts": {"bed_count": 120},
    "audit_entries": [],
}


def make_tool_response(tool_input):
    msg = MagicMock()
    tu = MagicMock()
    tu.type = "tool_use"
    tu.input = tool_input
    msg.content = [tu]
    return msg


def test_stakeholder_mapper_returns_contacts():
    contacts = [
        {"name": "", "title": "Administrator", "email": "", "linkedin_url": "", "source": "inferred", "confidence": 0.8, "rationale": "Primary ops buyer at SNF"},
        {"name": "", "title": "Director of Nursing", "email": "", "linkedin_url": "", "source": "inferred", "confidence": 0.7, "rationale": "Clinical ops influence"},
    ]
    tool_input = {"contacts": contacts, "primary_contact_index": 0, "rationale": "Standard SNF buyer map"}
    with patch("app.agents.nodes.stakeholder_mapper.call_claude", return_value=make_tool_response(tool_input)), \
         patch("app.agents.nodes.stakeholder_mapper.write_audit_log"), \
         patch("app.agents.nodes.stakeholder_mapper.upsert_contacts"):
        from app.agents.nodes.stakeholder_mapper import stakeholder_mapper_node
        result = stakeholder_mapper_node(BASE_STATE)
        assert len(result["contacts"]) == 2
        assert result["contacts"][0]["title"] == "Administrator"
        assert result["audit_entries"][0]["node"] == "stakeholder_mapper"
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_stakeholder_mapper.py -v
```

Expected: FAIL.

- [ ] **Step 3: Replace `backend/app/agents/nodes/stakeholder_mapper.py`**

```python
import json
from ..state import AgentState
from ...claude import call_claude
from ...supabase_client import write_audit_log, upsert_contacts

MAP_STAKEHOLDERS_TOOL = {
    "name": "map_stakeholders",
    "description": "Identify likely buyer roles at this skilled nursing facility",
    "input_schema": {
        "type": "object",
        "properties": {
            "contacts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Full name if known, else empty string"},
                        "title": {"type": "string"},
                        "email": {"type": "string", "description": "Email if known, else empty string"},
                        "linkedin_url": {"type": "string", "description": "LinkedIn URL if known, else empty string"},
                        "source": {"type": "string", "enum": ["verified", "inferred"]},
                        "confidence": {"type": "number"},
                        "rationale": {"type": "string"}
                    },
                    "required": ["name", "title", "email", "linkedin_url", "source", "confidence", "rationale"]
                }
            },
            "primary_contact_index": {"type": "integer"},
            "rationale": {"type": "string"}
        },
        "required": ["contacts", "primary_contact_index", "rationale"]
    }
}


def stakeholder_mapper_node(state: AgentState) -> dict:
    account = state["account_data"]

    prompt = f"""Identify likely buyer stakeholders at this skilled nursing facility.

Owle AI's buyers: Administrator, COO, VP Operations, Director of Nursing, or similar operational leadership.

Account:
{json.dumps(account, indent=2)}

ICP score: {state.get('icp_score')}
Verified facts: {json.dumps(state.get('verified_facts', {}), indent=2)}

Rules:
- List 2-4 contacts in priority order
- source="verified" ONLY if name/title/email is explicitly in the account data
- source="inferred" for roles you expect to exist
- Never invent specific names or emails — use empty string if unknown
- primary_contact_index: index of best first outreach target

Call map_stakeholders."""

    msg = call_claude(prompt, tools=[MAP_STAKEHOLDERS_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    if not tool_use:
        contacts_data = []
        rationale = "Could not map stakeholders"
    else:
        contacts_data = tool_use.input.get("contacts", [])
        rationale = tool_use.input.get("rationale", "")

    supabase_contacts = [
        {
            "account_id": state["account_id"],
            "name": c.get("name") or None,
            "title": c.get("title"),
            "email": c.get("email") or None,
            "linkedin_url": c.get("linkedin_url") or None,
            "source": c.get("source", "inferred"),
            "confidence": c.get("confidence"),
        }
        for c in contacts_data
    ]
    upsert_contacts(supabase_contacts)

    entry = {
        "node": "stakeholder_mapper",
        "action": f"mapped {len(contacts_data)} stakeholders",
        "rationale": rationale,
        "verified_facts": {},
        "inferred_assumptions": {"contacts": contacts_data},
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="stakeholder_mapper",
        action=entry["action"],
        rationale=rationale,
        verified_facts={},
        inferred_assumptions={"contacts": contacts_data},
    )

    return {
        "contacts": contacts_data,
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_stakeholder_mapper.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/agents/nodes/stakeholder_mapper.py tests/test_stakeholder_mapper.py
git commit -m "feat: implement stakeholder_mapper with real Claude contact mapping"
```

---

## Task 5: strategy_decider — real implementation

**Files:**
- Modify: `backend/app/agents/nodes/strategy_decider.py`
- Create: `backend/tests/test_strategy_decider.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_strategy_decider.py`:

```python
from unittest.mock import patch, MagicMock

BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF"},
    "icp_score": 90.0,
    "priority_score": 85.0,
    "contacts": [{"title": "Administrator", "source": "inferred"}],
    "verified_facts": {},
    "audit_entries": [],
}


def make_tool_response(tool_input):
    msg = MagicMock()
    tu = MagicMock()
    tu.type = "tool_use"
    tu.input = tool_input
    msg.content = [tu]
    return msg


def test_strategy_decider_returns_strategy():
    tool_input = {
        "action": "pursue",
        "channel": "email",
        "lead_type": "founder_led",
        "angle": "documentation burden reduction",
        "rationale": "High ICP fit, email is best channel for SNF admins",
        "verified_facts": {},
        "inferred_assumptions": {"lead_type_reason": "icp_score > 75"},
    }
    with patch("app.agents.nodes.strategy_decider.call_claude", return_value=make_tool_response(tool_input)), \
         patch("app.agents.nodes.strategy_decider.write_audit_log"):
        from app.agents.nodes.strategy_decider import strategy_decider_node
        result = strategy_decider_node(BASE_STATE)
        assert result["strategy"]["action"] == "pursue"
        assert result["strategy"]["angle"] == "documentation burden reduction"
        assert result["audit_entries"][0]["node"] == "strategy_decider"
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_strategy_decider.py -v
```

Expected: FAIL.

- [ ] **Step 3: Replace `backend/app/agents/nodes/strategy_decider.py`**

```python
import json
from ..state import AgentState
from ...claude import call_claude
from ...supabase_client import write_audit_log

DECIDE_STRATEGY_TOOL = {
    "name": "decide_strategy",
    "description": "Choose outreach strategy for this account",
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["pursue", "pause", "escalate"]},
            "channel": {"type": "string", "enum": ["email", "linkedin", "email_then_linkedin"]},
            "lead_type": {"type": "string", "enum": ["founder_led", "agent_led"]},
            "angle": {"type": "string", "description": "Specific messaging angle for this facility"},
            "rationale": {"type": "string"},
            "verified_facts": {"type": "object"},
            "inferred_assumptions": {"type": "object"}
        },
        "required": ["action", "channel", "lead_type", "angle", "rationale", "verified_facts", "inferred_assumptions"]
    }
}


def strategy_decider_node(state: AgentState) -> dict:
    account = state["account_data"]
    contacts = state.get("contacts", [])

    prompt = f"""Decide the outreach strategy for this skilled nursing facility.

Account: {json.dumps(account, indent=2)}
ICP score: {state.get('icp_score')} | Priority: {state.get('priority_score')}
Contacts: {json.dumps(contacts, indent=2)}
Verified facts: {json.dumps(state.get('verified_facts', {}), indent=2)}

Owle AI context:
- Early-stage company, founder-led preferred for high-value targets (icp_score > 75)
- Email is better than LinkedIn for SNF administrators and operators
- Best angles: reducing documentation burden, improving care coordination, staffing workflow efficiency

Decide:
- action: pursue=go now, pause=wait, escalate=human review needed
- channel: email leads for most SNF operators
- lead_type: founder_led if icp_score > 75
- angle: the single most specific, credible angle for THIS facility

Call decide_strategy."""

    msg = call_claude(prompt, tools=[DECIDE_STRATEGY_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    if not tool_use:
        strategy = {
            "action": "pause",
            "channel": "email",
            "lead_type": "agent_led",
            "angle": "operational efficiency",
            "rationale": "Could not determine strategy",
            "verified_facts": {},
            "inferred_assumptions": {},
        }
    else:
        strategy = tool_use.input

    entry = {
        "node": "strategy_decider",
        "action": f"strategy: {strategy['action']} via {strategy['channel']} ({strategy['lead_type']}), angle: {strategy['angle']}",
        "rationale": strategy["rationale"],
        "verified_facts": strategy.get("verified_facts", {}),
        "inferred_assumptions": strategy.get("inferred_assumptions", {}),
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="strategy_decider",
        action=entry["action"],
        rationale=strategy["rationale"],
        verified_facts=strategy.get("verified_facts", {}),
        inferred_assumptions=strategy.get("inferred_assumptions", {}),
    )

    return {
        "strategy": strategy,
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_strategy_decider.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/agents/nodes/strategy_decider.py tests/test_strategy_decider.py
git commit -m "feat: implement strategy_decider with real Claude strategy selection"
```

---

## Task 6: outreach_generator — real implementation

**Files:**
- Modify: `backend/app/agents/nodes/outreach_generator.py`
- Create: `backend/tests/test_outreach_generator.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_outreach_generator.py`:

```python
from unittest.mock import patch, MagicMock

BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF", "location": "Dallas, TX"},
    "contacts": [{"title": "Administrator", "name": "", "source": "inferred"}],
    "strategy": {"channel": "email", "angle": "documentation burden reduction", "lead_type": "founder_led", "action": "pursue"},
    "verified_facts": {},
    "audit_entries": [],
}


def make_tool_response(tool_input):
    msg = MagicMock()
    tu = MagicMock()
    tu.type = "tool_use"
    tu.input = tool_input
    msg.content = [tu]
    return msg


def test_outreach_generator_returns_drafts():
    tool_input = {
        "email_subject": "Reducing documentation load at Sunrise SNF",
        "email_body": "Hi,\n\nWe help SNF operators cut documentation time...",
        "linkedin_message": "Hi — I work with SNF operators on reducing documentation burden...",
        "rationale": "Documentation angle resonates with admins",
    }
    mock_action = {"id": "action-1", "status": "pending_approval"}
    with patch("app.agents.nodes.outreach_generator.call_claude", return_value=make_tool_response(tool_input)), \
         patch("app.agents.nodes.outreach_generator.write_audit_log"), \
         patch("app.agents.nodes.outreach_generator.create_outreach_action", return_value=mock_action):
        from app.agents.nodes.outreach_generator import outreach_generator_node
        result = outreach_generator_node(BASE_STATE)
        assert result["email_subject"] == "Reducing documentation load at Sunrise SNF"
        assert result["hitl_approved"] is False
        assert result["audit_entries"][0]["node"] == "outreach_generator"
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_outreach_generator.py -v
```

Expected: FAIL.

- [ ] **Step 3: Replace `backend/app/agents/nodes/outreach_generator.py`**

```python
import json
from ..state import AgentState
from ...claude import call_claude
from ...supabase_client import write_audit_log, create_outreach_action

GENERATE_OUTREACH_TOOL = {
    "name": "generate_outreach",
    "description": "Draft personalized email and LinkedIn outreach for a skilled nursing facility",
    "input_schema": {
        "type": "object",
        "properties": {
            "email_subject": {"type": "string", "description": "Specific, not generic. Under 60 chars."},
            "email_body": {"type": "string", "description": "150-200 words. 3-4 short paragraphs. No buzzwords."},
            "linkedin_message": {"type": "string", "description": "Under 300 chars. Direct."},
            "rationale": {"type": "string"}
        },
        "required": ["email_subject", "email_body", "linkedin_message", "rationale"]
    }
}


def outreach_generator_node(state: AgentState) -> dict:
    account = state["account_data"]
    contacts = state.get("contacts", [])
    strategy = state.get("strategy", {})
    primary_contact = contacts[0] if contacts else {}

    prompt = f"""Draft personalized outreach for this skilled nursing facility.

Account: {json.dumps(account, indent=2)}
Primary contact role: {primary_contact.get('title', 'Administrator')}
Strategy: channel={strategy.get('channel')}, angle={strategy.get('angle')}, lead_type={strategy.get('lead_type')}
Verified facts: {json.dumps(state.get('verified_facts', {}), indent=2)}

Owle AI pitch:
- Operational AI tools for skilled nursing facilities
- Reduces documentation time, improves care coordination, staffing workflows
- Pilot-first: low risk, fast to see ROI

Email guidelines:
- Subject: specific to their facility, not generic "AI for healthcare"
- Opening: acknowledge something specific about their role or facility size/location
- Value prop: one concrete outcome (not a feature list)
- CTA: 20-minute call to see if it's relevant
- Tone: peer-to-peer, not vendor pitch. No buzzwords.
- Length: 150-200 words max

LinkedIn: under 300 chars, direct, reference their role/facility.

Call generate_outreach."""

    msg = call_claude(prompt, tools=[GENERATE_OUTREACH_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    if not tool_use:
        email_subject = "Quick question about ops at your facility"
        email_body = "Could not generate personalized outreach."
        linkedin_message = "Hi — reaching out about operational AI for SNFs."
        rationale = "Generation failed"
    else:
        email_subject = tool_use.input["email_subject"]
        email_body = tool_use.input["email_body"]
        linkedin_message = tool_use.input["linkedin_message"]
        rationale = tool_use.input["rationale"]

    create_outreach_action({
        "account_id": state["account_id"],
        "channel": "email",
        "subject": email_subject,
        "body": email_body,
        "status": "pending_approval",
    })

    create_outreach_action({
        "account_id": state["account_id"],
        "channel": "linkedin",
        "body": linkedin_message,
        "status": "pending_approval",
    })

    entry = {
        "node": "outreach_generator",
        "action": f"drafted email '{email_subject}' and LinkedIn message",
        "rationale": rationale,
        "verified_facts": {},
        "inferred_assumptions": {},
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="outreach_generator",
        action=entry["action"],
        rationale=rationale,
        verified_facts={},
        inferred_assumptions={},
    )

    return {
        "email_draft": email_body,
        "email_subject": email_subject,
        "linkedin_draft": linkedin_message,
        "hitl_approved": False,
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_outreach_generator.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/agents/nodes/outreach_generator.py tests/test_outreach_generator.py
git commit -m "feat: implement outreach_generator with real Claude drafts"
```

---

## Task 7: reply_classifier, meeting_booker, learning_updater — real implementation

**Files:**
- Modify: `backend/app/agents/nodes/reply_classifier.py`
- Modify: `backend/app/agents/nodes/meeting_booker.py`
- Modify: `backend/app/agents/nodes/learning_updater.py`
- Create: `backend/tests/test_reply_classifier.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_reply_classifier.py`:

```python
from unittest.mock import patch, MagicMock

BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF"},
    "strategy": {"angle": "documentation burden"},
    "reply_text": "Hi, yes we'd be interested in learning more. What does a pilot look like?",
    "audit_entries": [],
}


def make_tool_response(tool_input):
    msg = MagicMock()
    tu = MagicMock()
    tu.type = "tool_use"
    tu.input = tool_input
    msg.content = [tu]
    return msg


def test_reply_classifier_interested():
    tool_input = {
        "classification": "interested",
        "confidence": 0.95,
        "rationale": "Clear positive signal asking about pilot",
        "response_draft": "Great to hear! Happy to walk you through what a pilot looks like...",
        "escalate_to_human": False,
    }
    with patch("app.agents.nodes.reply_classifier.call_claude", return_value=make_tool_response(tool_input)), \
         patch("app.agents.nodes.reply_classifier.write_audit_log"):
        from app.agents.nodes.reply_classifier import reply_classifier_node
        result = reply_classifier_node(BASE_STATE)
        assert result["reply_classification"] == "interested"
        assert result["reply_confidence"] == 0.95
        assert result["audit_entries"][0]["node"] == "reply_classifier"
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_reply_classifier.py -v
```

Expected: FAIL.

- [ ] **Step 3: Replace `backend/app/agents/nodes/reply_classifier.py`**

```python
from ..state import AgentState
from ...claude import call_claude
from ...supabase_client import write_audit_log

CLASSIFY_REPLY_TOOL = {
    "name": "classify_reply",
    "description": "Classify an inbound reply and draft the next response",
    "input_schema": {
        "type": "object",
        "properties": {
            "classification": {
                "type": "string",
                "enum": ["interested", "not_now", "referral", "not_a_fit", "unsubscribe", "unclear"]
            },
            "confidence": {"type": "number"},
            "rationale": {"type": "string"},
            "response_draft": {
                "type": "string",
                "description": "Draft response. Empty string for unsubscribe or not_a_fit."
            },
            "escalate_to_human": {
                "type": "boolean",
                "description": "True if reply needs human review before responding"
            }
        },
        "required": ["classification", "confidence", "rationale", "response_draft", "escalate_to_human"]
    }
}


def reply_classifier_node(state: AgentState) -> dict:
    reply_text = state.get("reply_text", "")
    account = state["account_data"]

    prompt = f"""Classify this inbound reply and draft a response.

Account: {account.get('name')}
Original outreach angle: {(state.get('strategy') or {}).get('angle', 'unknown')}

Reply:
---
{reply_text}
---

Classification guide:
- interested: clear positive signal, wants to learn more or schedule
- not_now: politely declining but leaving door open ("reach out in Q3")
- referral: redirecting to someone else ("talk to our DON")
- not_a_fit: clear rejection ("we don't need this")
- unsubscribe: explicit opt-out
- unclear: ambiguous, cannot determine intent

Response guidelines:
- interested: brief, enthusiastic, propose 2-3 specific times for a 20-min call
- not_now: acknowledge, ask for better time
- referral: thank them, ask for referral's contact info
- not_a_fit: graceful close, leave door open
- unsubscribe: empty string — do NOT draft a response
- unclear: ask one clarifying question

escalate_to_human: true if unusual, sensitive, or low confidence.

Call classify_reply."""

    msg = call_claude(prompt, tools=[CLASSIFY_REPLY_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    if not tool_use:
        classification, confidence, response_draft, rationale, escalate = "unclear", 0.0, "", "Could not classify", True
    else:
        classification = tool_use.input["classification"]
        confidence = tool_use.input["confidence"]
        response_draft = tool_use.input["response_draft"]
        rationale = tool_use.input["rationale"]
        escalate = tool_use.input.get("escalate_to_human", False)

    entry = {
        "node": "reply_classifier",
        "action": f"classified as '{classification}' (confidence: {confidence:.0%}){' — escalated' if escalate else ''}",
        "rationale": rationale,
        "verified_facts": {},
        "inferred_assumptions": {},
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="reply_classifier",
        action=entry["action"],
        rationale=rationale,
        verified_facts={},
        inferred_assumptions={},
    )

    return {
        "reply_classification": classification,
        "reply_confidence": confidence,
        "response_draft": response_draft,
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
```

- [ ] **Step 4: Replace `backend/app/agents/nodes/meeting_booker.py`**

```python
from ..state import AgentState
from ...claude import call_claude
from ...supabase_client import write_audit_log, get_supabase

ASSESS_MEETING_TOOL = {
    "name": "assess_meeting_intent",
    "description": "Assess meeting intent and determine next steps",
    "input_schema": {
        "type": "object",
        "properties": {
            "meeting_status": {
                "type": "string",
                "enum": ["confirmed", "proposed", "soft_interest", "not_applicable"]
            },
            "next_steps": {"type": "string"},
            "rationale": {"type": "string"}
        },
        "required": ["meeting_status", "next_steps", "rationale"]
    }
}


def meeting_booker_node(state: AgentState) -> dict:
    classification = state.get("reply_classification", "unclear")

    if classification not in ("interested", "not_now", "referral"):
        entry = {
            "node": "meeting_booker",
            "action": f"no meeting action for classification: {classification}",
            "rationale": "Only interested/not_now/referral trigger meeting booking",
            "verified_facts": {},
            "inferred_assumptions": {},
        }
        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="meeting_booker",
            action=entry["action"],
            rationale=entry["rationale"],
            verified_facts={},
            inferred_assumptions={},
        )
        return {"meeting_status": "not_applicable", "audit_entries": state.get("audit_entries", []) + [entry]}

    account = state["account_data"]
    prompt = f"""Assess meeting intent for this prospect.

Account: {account.get('name')}
Reply classification: {classification}
Response we drafted: {state.get('response_draft', '')}

Determine meeting status and concrete next steps.
Call assess_meeting_intent."""

    msg = call_claude(prompt, tools=[ASSESS_MEETING_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    if not tool_use:
        meeting_status, next_steps, rationale = "soft_interest", "Follow up manually", "Could not assess"
    else:
        meeting_status = tool_use.input["meeting_status"]
        next_steps = tool_use.input["next_steps"]
        rationale = tool_use.input["rationale"]

    if meeting_status in ("confirmed", "proposed"):
        get_supabase().table("meetings").insert({
            "account_id": state["account_id"],
            "status": meeting_status,
            "proposed_times": [],
        }).execute()

    entry = {
        "node": "meeting_booker",
        "action": f"meeting: {meeting_status} — {next_steps}",
        "rationale": rationale,
        "verified_facts": {},
        "inferred_assumptions": {},
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="meeting_booker",
        action=entry["action"],
        rationale=rationale,
        verified_facts={},
        inferred_assumptions={},
    )

    return {"meeting_status": meeting_status, "audit_entries": state.get("audit_entries", []) + [entry]}
```

- [ ] **Step 5: Replace `backend/app/agents/nodes/learning_updater.py`**

```python
from ..state import AgentState
from ...supabase_client import write_audit_log, write_outcome_signal


def learning_updater_node(state: AgentState) -> dict:
    strategy = state.get("strategy") or {}
    contacts = state.get("contacts") or [{}]
    classification = state.get("reply_classification")
    meeting_status = state.get("meeting_status")

    signal = {
        "account_id": state["account_id"],
        "message_angle": strategy.get("angle"),
        "persona": contacts[0].get("title") if contacts else None,
        "channel": strategy.get("channel"),
        "reply_received": classification is not None,
        "meeting_booked": meeting_status in ("confirmed", "proposed"),
    }
    write_outcome_signal(signal)

    entry = {
        "node": "learning_updater",
        "action": f"logged outcome: reply={signal['reply_received']}, meeting={signal['meeting_booked']}",
        "rationale": f"angle='{signal['message_angle']}', channel='{signal['channel']}'",
        "verified_facts": {},
        "inferred_assumptions": {},
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="learning_updater",
        action=entry["action"],
        rationale=entry["rationale"],
        verified_facts={},
        inferred_assumptions={},
    )

    return {"audit_entries": state.get("audit_entries", []) + [entry]}
```

- [ ] **Step 6: Run tests**

```bash
cd backend
pytest tests/test_reply_classifier.py -v
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/agents/nodes/reply_classifier.py app/agents/nodes/meeting_booker.py app/agents/nodes/learning_updater.py tests/test_reply_classifier.py
git commit -m "feat: implement reply_classifier, meeting_booker, learning_updater"
```

---

## Task 8: accounts router — CSV upload + graph trigger

**Files:**
- Modify: `backend/app/routers/accounts.py`
- Create: `backend/tests/test_accounts_router.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_accounts_router.py`:

```python
import io
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_upload_csv_processes_accounts():
    csv_content = b"name,bed_count,type,location\nSunrise SNF,120,skilled_nursing_facility,Dallas TX\n"
    
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "acc-1"},
        {"id": "run-1"},
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    
    mock_graph = MagicMock()
    mock_graph.invoke.return_value = {
        "icp_score": 85.0,
        "priority_score": 80.0,
        "strategy": {"action": "pursue"},
        "email_draft": "Hello...",
        "audit_entries": [],
    }
    
    with patch("app.routers.accounts.get_supabase", return_value=mock_supabase), \
         patch("app.routers.accounts.build_outreach_graph", return_value=mock_graph):
        from app.main import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/accounts/upload",
                files={"file": ("accounts.csv", csv_content, "text/csv")},
            )
    
    assert response.status_code == 200
    data = response.json()
    assert data["processed"] == 1
    assert len(data["accounts"]) == 1


@pytest.mark.asyncio
async def test_upload_rejects_non_csv():
    with patch("app.routers.accounts.get_supabase"), \
         patch("app.routers.accounts.build_outreach_graph"):
        from app.main import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/accounts/upload",
                files={"file": ("accounts.txt", b"not a csv", "text/plain")},
            )
    assert response.status_code == 400
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_accounts_router.py -v
```

Expected: FAIL.

- [ ] **Step 3: Replace `backend/app/routers/accounts.py`**

```python
import csv
import io
import uuid
from fastapi import APIRouter, UploadFile, File, Request, HTTPException

from ..supabase_client import get_supabase
from ..agents.graph import build_outreach_graph

router = APIRouter()


@router.get("/")
def list_accounts():
    result = (
        get_supabase()
        .table("accounts")
        .select("*")
        .order("priority_score", desc=True, nullsfirst=False)
        .execute()
    )
    return result.data


@router.post("/upload")
async def upload_accounts(request: Request, file: UploadFile = File(...)):
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    supabase = get_supabase()
    graph = build_outreach_graph(request.app.state.checkpointer)

    results = []
    for row in reader:
        account_data = {k.strip(): v.strip() for k, v in row.items() if v and v.strip()}
        name = account_data.get("name") or account_data.get("facility_name") or "Unknown"

        bed_count = None
        raw_beds = account_data.get("bed_count") or account_data.get("beds")
        if raw_beds:
            try:
                bed_count = int(raw_beds) or None
            except ValueError:
                pass

        acc_result = supabase.table("accounts").insert({
            "name": name,
            "type": account_data.get("type", "skilled_nursing_facility"),
            "bed_count": bed_count,
            "location": account_data.get("location") or account_data.get("city"),
            "raw_data": account_data,
            "status": "new",
        }).execute()
        account_id = acc_result.data[0]["id"]

        thread_id = str(uuid.uuid4())
        run_result = supabase.table("agent_runs").insert({
            "account_id": account_id,
            "graph_thread_id": thread_id,
            "current_node": "account_selector",
            "status": "running",
        }).execute()
        agent_run_id = run_result.data[0]["id"]

        initial_state = {
            "account_id": account_id,
            "agent_run_id": agent_run_id,
            "account_data": account_data,
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
        config = {"configurable": {"thread_id": thread_id}}

        try:
            final_state = graph.invoke(initial_state, config)
            supabase.table("agent_runs").update({
                "status": "waiting_hitl",
                "current_node": "outreach_generator",
            }).eq("id", agent_run_id).execute()
            results.append({
                "account_id": account_id,
                "name": name,
                "icp_score": final_state.get("icp_score"),
                "priority_score": final_state.get("priority_score"),
                "recommendation": (final_state.get("strategy") or {}).get("action"),
                "thread_id": thread_id,
            })
        except Exception as e:
            supabase.table("agent_runs").update({"status": "failed"}).eq("id", agent_run_id).execute()
            results.append({"account_id": account_id, "name": name, "error": str(e)})

    return {"processed": len(results), "accounts": results}
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_accounts_router.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/routers/accounts.py tests/test_accounts_router.py
git commit -m "feat: accounts router — CSV upload triggers outreach graph"
```

---

## Task 9: outreach router — queue + approve + reject

**Files:**
- Modify: `backend/app/routers/outreach.py`

- [ ] **Step 1: Replace `backend/app/routers/outreach.py`**

```python
from fastapi import APIRouter, HTTPException
from ..supabase_client import get_supabase

router = APIRouter()


@router.get("/queue")
def get_queue():
    result = (
        get_supabase()
        .table("outreach_actions")
        .select("*, accounts(name, icp_score, priority_score, location)")
        .eq("status", "pending_approval")
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/{outreach_id}/approve")
def approve_outreach(outreach_id: str):
    result = (
        get_supabase()
        .table("outreach_actions")
        .update({"status": "approved"})
        .eq("id", outreach_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Outreach action not found")
    return {"status": "approved", "outreach_id": outreach_id}


@router.post("/{outreach_id}/reject")
def reject_outreach(outreach_id: str):
    result = (
        get_supabase()
        .table("outreach_actions")
        .update({"status": "draft"})
        .eq("id", outreach_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Outreach action not found")
    return {"status": "returned_to_draft", "outreach_id": outreach_id}


@router.get("/account/{account_id}")
def get_account_outreach(account_id: str):
    result = (
        get_supabase()
        .table("outreach_actions")
        .select("*")
        .eq("account_id", account_id)
        .order("created_at")
        .execute()
    )
    return result.data
```

- [ ] **Step 2: Run full test suite**

```bash
cd backend
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/routers/outreach.py
git commit -m "feat: outreach router — queue, approve, reject, account history"
```

---

## Task 10: webhooks router — reply ingestion

**Files:**
- Modify: `backend/app/routers/webhooks.py`

- [ ] **Step 1: Replace `backend/app/routers/webhooks.py`**

```python
import base64
import json
import uuid
from fastapi import APIRouter, Request, HTTPException

from ..supabase_client import get_supabase
from ..agents.graph import build_reply_graph

router = APIRouter()


@router.post("/gmail")
async def gmail_webhook(request: Request):
    body = await request.json()

    # Gmail push notifications wrap the message in base64
    try:
        message_data = body.get("message", {})
        encoded = message_data.get("data", "")
        decoded = json.loads(base64.b64decode(encoded).decode("utf-8"))
    except Exception:
        decoded = body

    email_body = decoded.get("body", "") or decoded.get("text", "") or str(decoded)
    thread_id_gmail = decoded.get("threadId") or decoded.get("thread_id")
    sender = decoded.get("from") or decoded.get("sender", "")

    supabase = get_supabase()

    # Find matching outreach_action by gmail_thread_id
    action_result = (
        supabase.table("outreach_actions")
        .select("*, accounts(*)")
        .eq("gmail_thread_id", thread_id_gmail)
        .limit(1)
        .execute()
    )

    if not action_result.data:
        # Log unmatched reply and return 200 (don't fail Gmail push)
        return {"status": "unmatched", "thread_id": thread_id_gmail}

    action = action_result.data[0]
    account = action["accounts"]
    account_id = account["id"]

    # Store reply
    reply_result = supabase.table("replies").insert({
        "outreach_action_id": action["id"],
        "body": email_body,
    }).execute()

    # Create agent_run for reply flow
    reply_thread_id = str(uuid.uuid4())
    run_result = supabase.table("agent_runs").insert({
        "account_id": account_id,
        "graph_thread_id": reply_thread_id,
        "current_node": "reply_classifier",
        "status": "running",
    }).execute()
    agent_run_id = run_result.data[0]["id"]

    # Build reply state from account context
    reply_state = {
        "account_id": account_id,
        "agent_run_id": agent_run_id,
        "account_data": account,
        "icp_score": account.get("icp_score"),
        "priority_score": account.get("priority_score"),
        "icp_rationale": None,
        "verified_facts": {},
        "inferred_assumptions": {},
        "contacts": [],
        "strategy": None,
        "email_draft": None,
        "email_subject": None,
        "linkedin_draft": None,
        "hitl_approved": False,
        "reply_text": email_body,
        "reply_classification": None,
        "reply_confidence": None,
        "response_draft": None,
        "meeting_status": None,
        "audit_entries": [],
    }
    config = {"configurable": {"thread_id": reply_thread_id}}

    try:
        graph = build_reply_graph(request.app.state.checkpointer)
        final_state = graph.invoke(reply_state, config)

        # Update reply with classification
        supabase.table("replies").update({
            "classification": final_state.get("reply_classification"),
            "confidence": final_state.get("reply_confidence"),
            "response_draft": final_state.get("response_draft"),
        }).eq("id", reply_result.data[0]["id"]).execute()

        # Update account status if meeting booked
        if final_state.get("meeting_status") in ("confirmed", "proposed"):
            supabase.table("accounts").update({"status": "meeting_booked"}).eq("id", account_id).execute()

        supabase.table("agent_runs").update({"status": "completed"}).eq("id", agent_run_id).execute()

    except Exception as e:
        supabase.table("agent_runs").update({"status": "failed"}).eq("id", agent_run_id).execute()
        return {"status": "error", "detail": str(e)}

    return {"status": "processed", "classification": final_state.get("reply_classification")}
```

- [ ] **Step 2: Run full test suite**

```bash
cd backend
pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 3: Commit + push**

```bash
git add app/routers/webhooks.py
git commit -m "feat: gmail webhook triggers reply classification pipeline"
git push origin main
```

---

## What's Next

- **Plan 3:** Gmail integration — OAuth setup, send approved email via Gmail API, link gmail_thread_id
- **Plan 4:** Frontend dashboard — Next.js, account list, HITL approval queue, reply inbox
