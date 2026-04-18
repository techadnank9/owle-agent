from unittest.mock import patch, MagicMock

BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF"},
    "icp_score": 90.0,
    "priority_score": 85.0,
    "contacts": [{"title": "Administrator", "source": "inferred"}],
    "verified_facts": {},
    "audit_entries": [],
}


def make_tool_response(tool_input):
    msg = MagicMock()
    tu = MagicMock()
    tu.type = "tool_use"
    tu.input = tool_input
    msg.content = [tu]
    return msg


def test_strategy_decider_returns_strategy():
    tool_input = {
        "action": "pursue",
        "channel": "email",
        "lead_type": "founder_led",
        "angle": "documentation burden reduction",
        "rationale": "High ICP fit, email best for SNF admins",
        "verified_facts": {},
        "inferred_assumptions": {"lead_type_reason": "icp_score > 75"},
    }
    with patch("app.agents.nodes.strategy_decider.call_claude", return_value=make_tool_response(tool_input)), \
         patch("app.agents.nodes.strategy_decider.write_audit_log"):
        from app.agents.nodes.strategy_decider import strategy_decider_node
        result = strategy_decider_node(BASE_STATE)
        assert result["strategy"]["action"] == "pursue"
        assert result["strategy"]["angle"] == "documentation burden reduction"
        assert result["audit_entries"][0]["node"] == "strategy_decider"
