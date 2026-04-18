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
