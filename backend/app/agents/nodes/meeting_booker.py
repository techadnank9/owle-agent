from ..state import AgentState


def meeting_booker_node(state: AgentState) -> dict:
    entry = {
        "node": "meeting_booker",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "meeting_status": "soft_interest",
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
