from ..state import AgentState


def reply_classifier_node(state: AgentState) -> dict:
    entry = {
        "node": "reply_classifier",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "reply_classification": "unclear",
        "reply_confidence": 0.0,
        "response_draft": "stub response",
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
