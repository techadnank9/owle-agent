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
