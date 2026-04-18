import pytest
from unittest.mock import MagicMock, patch


def make_mock_checkpointer():
    cp = MagicMock()
    cp.get.return_value = None
    cp.put.return_value = None
    cp.list.return_value = []
    return cp


def make_claude_tool_response(tool_input: dict):
    mock_msg = MagicMock()
    mock_tool = MagicMock()
    mock_tool.type = "tool_use"
    mock_tool.input = tool_input
    mock_msg.content = [mock_tool]
    return mock_msg


def test_graph_builds_without_error():
    from langgraph.checkpoint.memory import MemorySaver
    from app.agents.graph import build_graph
    graph = build_graph(MemorySaver())
    assert graph is not None


def test_graph_runs_through_outreach_generator():
    from langgraph.checkpoint.memory import MemorySaver
    from app.agents.graph import build_graph

    account_selector_tool_response = make_claude_tool_response({
        "icp_score": 90.0,
        "priority_score": 85.0,
        "icp_rationale": "Large SNF, clear ICP fit",
        "verified_facts": {"bed_count": 120},
        "inferred_assumptions": {},
        "recommendation": "pursue",
    })

    graph = build_graph(MemorySaver())
    initial_state = {
        "account_id": "test-account-001",
        "agent_run_id": "test-run-001",
        "account_data": {
            "name": "Sunrise Skilled Nursing",
            "bed_count": 120,
            "location": "Dallas, TX",
            "type": "skilled_nursing_facility",
        },
        "icp_score": None,
        "priority_score": None,
        "icp_rationale": None,
        "verified_facts": {},
        "inferred_assumptions": {},
        "contacts": [],
        "strategy": None,
        "email_draft": None,
        "email_subject": None,
        "linkedin_draft": None,
        "hitl_approved": False,
        "reply_text": None,
        "reply_classification": None,
        "reply_confidence": None,
        "response_draft": None,
        "meeting_status": None,
        "audit_entries": [],
    }
    config = {"configurable": {"thread_id": "test-thread-001"}}

    with patch("app.agents.nodes.account_selector.call_claude", return_value=account_selector_tool_response), \
         patch("app.agents.nodes.account_selector.write_audit_log"), \
         patch("app.agents.nodes.account_selector.update_account"):
        result = graph.invoke(initial_state, config)

    assert result["icp_score"] == 90.0
    assert result["contacts"] == []
    assert result["email_draft"] == "stub email body"
    assert len(result["audit_entries"]) == 4
