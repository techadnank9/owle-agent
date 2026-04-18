import pytest
from unittest.mock import patch, MagicMock


def make_claude_tool_response(tool_input: dict):
    mock_msg = MagicMock()
    mock_tool = MagicMock()
    mock_tool.type = "tool_use"
    mock_tool.input = tool_input
    mock_msg.content = [mock_tool]
    return mock_msg


BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF", "bed_count": "120", "type": "skilled_nursing_facility", "location": "Dallas, TX"},
    "audit_entries": [],
    "verified_facts": {},
    "inferred_assumptions": {},
}


def test_account_selector_returns_scores():
    tool_input = {
        "icp_score": 90.0,
        "priority_score": 85.0,
        "icp_rationale": "Large SNF, clear ICP fit",
        "verified_facts": {"bed_count": 120},
        "inferred_assumptions": {},
        "recommendation": "pursue",
    }
    with patch("app.agents.nodes.account_selector.call_claude", return_value=make_claude_tool_response(tool_input)), \
         patch("app.agents.nodes.account_selector.write_audit_log"), \
         patch("app.agents.nodes.account_selector.update_account"):
        from app.agents.nodes.account_selector import account_selector_node
        result = account_selector_node(BASE_STATE)
        assert result["icp_score"] == 90.0
        assert result["priority_score"] == 85.0
        assert result["icp_rationale"] == "Large SNF, clear ICP fit"
        assert len(result["audit_entries"]) == 1
        assert result["audit_entries"][0]["node"] == "account_selector"


def test_account_selector_fallback_when_no_tool_use():
    mock_msg = MagicMock()
    mock_msg.content = []
    with patch("app.agents.nodes.account_selector.call_claude", return_value=mock_msg), \
         patch("app.agents.nodes.account_selector.write_audit_log"), \
         patch("app.agents.nodes.account_selector.update_account"):
        from app.agents.nodes.account_selector import account_selector_node
        result = account_selector_node(BASE_STATE)
        assert result["icp_score"] == 50.0
        assert result["audit_entries"][0]["node"] == "account_selector"
