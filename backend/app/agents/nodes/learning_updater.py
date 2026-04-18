from ..state import AgentState
from ...supabase_client import write_audit_log, write_outcome_signal


def learning_updater_node(state: AgentState) -> dict:
    strategy = state.get("strategy") or {}
    contacts = state.get("contacts") or [{}]
    classification = state.get("reply_classification")
    meeting_status = state.get("meeting_status")

    signal = {
        "account_id": state["account_id"],
        "message_angle": strategy.get("angle"),
        "persona": contacts[0].get("title") if contacts else None,
        "channel": strategy.get("channel"),
        "reply_received": classification is not None,
        "meeting_booked": meeting_status in ("confirmed", "proposed"),
    }
    write_outcome_signal(signal)

    entry = {
        "node": "learning_updater",
        "action": f"logged outcome: reply={signal['reply_received']}, meeting={signal['meeting_booked']}",
        "rationale": f"angle='{signal['message_angle']}', channel='{signal['channel']}'",
        "verified_facts": {},
        "inferred_assumptions": {},
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="learning_updater",
        action=entry["action"],
        rationale=entry["rationale"],
        verified_facts={},
        inferred_assumptions={},
    )

    return {"audit_entries": state.get("audit_entries", []) + [entry]}
