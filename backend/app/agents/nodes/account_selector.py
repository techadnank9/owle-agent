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
