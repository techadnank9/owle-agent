from unittest.mock import patch, MagicMock

BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF", "location": "Dallas, TX"},
    "contacts": [{"title": "Administrator", "name": "", "source": "inferred"}],
    "strategy": {"channel": "email", "angle": "documentation burden reduction", "lead_type": "founder_led", "action": "pursue"},
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


def test_outreach_generator_returns_drafts():
    tool_input = {
        "email_subject": "Reducing documentation load at Sunrise SNF",
        "email_body": "Hi,\n\nWe help SNF operators cut documentation time...",
        "linkedin_message": "Hi — I work with SNF operators on reducing documentation burden...",
        "rationale": "Documentation angle resonates with admins",
    }
    mock_action = {"id": "action-1", "status": "pending_approval"}
    with patch("app.agents.nodes.outreach_generator.call_claude", return_value=make_tool_response(tool_input)), \
         patch("app.agents.nodes.outreach_generator.write_audit_log"), \
         patch("app.agents.nodes.outreach_generator.create_outreach_action", return_value=mock_action):
        from app.agents.nodes.outreach_generator import outreach_generator_node
        result = outreach_generator_node(BASE_STATE)
        assert result["email_subject"] == "Reducing documentation load at Sunrise SNF"
        assert result["hitl_approved"] is False
        assert result["audit_entries"][0]["node"] == "outreach_generator"
