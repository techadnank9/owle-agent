from ..state import AgentState


def strategy_decider_node(state: AgentState) -> dict:
    entry = {
        "node": "strategy_decider",
        "action": "stub — not yet implemented",
        "rationale": "",
        "verified_facts": {},
        "inferred_assumptions": {},
    }
    return {
        "strategy": {"channel": "email", "angle": "stub", "lead_type": "agent_led", "action": "pursue"},
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
