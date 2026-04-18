from unittest.mock import patch, MagicMock

BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF"},
    "strategy": {"angle": "documentation burden"},
    "reply_text": "Hi, yes we'd be interested in learning more. What does a pilot look like?",
    "audit_entries": [],
}


def make_tool_response(tool_input):
    msg = MagicMock()
    tu = MagicMock()
    tu.type = "tool_use"
    tu.input = tool_input
    msg.content = [tu]
    return msg


def test_reply_classifier_interested():
    tool_input = {
        "classification": "interested",
        "confidence": 0.95,
        "rationale": "Clear positive signal asking about pilot",
        "response_draft": "Great to hear! Happy to walk you through what a pilot looks like...",
        "escalate_to_human": False,
    }
    with patch("app.agents.nodes.reply_classifier.call_claude", return_value=make_tool_response(tool_input)), \
         patch("app.agents.nodes.reply_classifier.write_audit_log"):
        from app.agents.nodes.reply_classifier import reply_classifier_node
        result = reply_classifier_node(BASE_STATE)
        assert result["reply_classification"] == "interested"
        assert result["reply_confidence"] == 0.95
        assert result["audit_entries"][0]["node"] == "reply_classifier"
