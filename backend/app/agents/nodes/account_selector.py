from ..state import AgentState


def account_selector_node(state: AgentState) -> dict:
    entry = {
        "node": "account_selector",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "icp_score": 0.0,
        "priority_score": 0.0,
        "icp_rationale": "stub",
        "verified_facts": {},
        "inferred_assumptions": {},
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
