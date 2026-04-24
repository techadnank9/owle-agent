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

    try:
        msg = call_claude(prompt, tools=[MAP_STAKEHOLDERS_TOOL])
        tool_use = next((b for b in msg.content if b.type == "tool_use"), None)
    except Exception as e:
        tool_use = None
        print(f"[stakeholder_mapper] Claude API failed: {e}")

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
