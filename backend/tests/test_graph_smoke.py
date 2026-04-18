import pytest
from unittest.mock import MagicMock


def make_mock_checkpointer():
    cp = MagicMock()
    cp.get.return_value = None
    cp.put.return_value = None
    cp.list.return_value = []
    return cp


def test_graph_builds_without_error():
    from langgraph.checkpoint.memory import MemorySaver
    from app.agents.graph import build_graph
    graph = build_graph(MemorySaver())
    assert graph is not None


def test_graph_runs_through_outreach_generator():
    from langgraph.checkpoint.memory import MemorySaver
    from app.agents.graph import build_graph

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

    result = graph.invoke(initial_state, config)

    assert result["icp_score"] == 0.0
    assert result["contacts"] == []
    assert result["email_draft"] == "stub email body"
    assert len(result["audit_entries"]) == 4
