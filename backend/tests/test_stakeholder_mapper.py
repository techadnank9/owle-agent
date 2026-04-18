from unittest.mock import patch, MagicMock

BASE_STATE = {
    "account_id": "acc-1",
    "agent_run_id": "run-1",
    "account_data": {"name": "Sunrise SNF", "bed_count": "120"},
    "icp_score": 90.0,
    "verified_facts": {"bed_count": 120},
    "audit_entries": [],
}


def make_tool_response(tool_input):
    msg = MagicMock()
    tu = MagicMock()
    tu.type = "tool_use"
    tu.input = tool_input
    msg.content = [tu]
    return msg


def test_stakeholder_mapper_returns_contacts():
    contacts = [
        {"name": "", "title": "Administrator", "email": "", "linkedin_url": "", "source": "inferred", "confidence": 0.8, "rationale": "Primary ops buyer"},
        {"name": "", "title": "Director of Nursing", "email": "", "linkedin_url": "", "source": "inferred", "confidence": 0.7, "rationale": "Clinical ops"},
    ]
    tool_input = {"contacts": contacts, "primary_contact_index": 0, "rationale": "Standard SNF buyer map"}
    with patch("app.agents.nodes.stakeholder_mapper.call_claude", return_value=make_tool_response(tool_input)), \
         patch("app.agents.nodes.stakeholder_mapper.write_audit_log"), \
         patch("app.agents.nodes.stakeholder_mapper.upsert_contacts"):
        from app.agents.nodes.stakeholder_mapper import stakeholder_mapper_node
        result = stakeholder_mapper_node(BASE_STATE)
        assert len(result["contacts"]) == 2
        assert result["contacts"][0]["title"] == "Administrator"
        assert result["audit_entries"][0]["node"] == "stakeholder_mapper"


def test_stakeholder_mapper_fallback():
    msg = MagicMock()
    msg.content = []
    with patch("app.agents.nodes.stakeholder_mapper.call_claude", return_value=msg), \
         patch("app.agents.nodes.stakeholder_mapper.write_audit_log"), \
         patch("app.agents.nodes.stakeholder_mapper.upsert_contacts"):
        from app.agents.nodes.stakeholder_mapper import stakeholder_mapper_node
        result = stakeholder_mapper_node(BASE_STATE)
        assert result["contacts"] == []
        assert result["audit_entries"][0]["node"] == "stakeholder_mapper"
