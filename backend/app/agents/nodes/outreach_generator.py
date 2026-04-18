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
- Opening: acknowledge something specific about their role or facility
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
