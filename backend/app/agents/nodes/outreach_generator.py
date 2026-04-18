from ..state import AgentState


def outreach_generator_node(state: AgentState) -> dict:
    entry = {
        "node": "outreach_generator",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "email_draft": "stub email body",
        "email_subject": "stub subject",
        "linkedin_draft": "stub linkedin message",
        "hitl_approved": False,
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
