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

Owle AI product summary:
- HIPAA-compliant AI agent for healthcare teams — works with existing systems, zero training, zero new logins
- Core outcome: gives clinicians/staff 2+ hours back per day by automating admin tasks (scheduling, care coordination, documentation back-and-forth)
- Business outcome: reduce staff burnout/turnover, improve margins without new hires, results in 30 days
- Model: pilot-first (limited Q4 spots), low commitment to start

Strategy rules:
- action: pursue if icp_score >= 60, pause if 40-59, escalate if data is missing or confusing
- channel: email for Administrators/DONs/COOs (email leads); linkedin if we have a direct profile URL
- lead_type: founder_led if icp_score >= 75 (high-value, personal touch matters); agent_led otherwise
- angle: pick the SINGLE most credible angle for THIS facility based on their data:
  * "staffing" — if high nurse turnover or low staffing ratings (strong pain point)
  * "documentation" — if CMS staffing burden indicators present
  * "care_coordination" — if multi-location or specialist referral patterns implied
  * "margins" — if recent fines, low CMS rating, or cost pressure signals
  * "operational_efficiency" — default if no specific signal

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
