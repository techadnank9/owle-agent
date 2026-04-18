from typing import TypedDict


class AgentState(TypedDict):
    # Metadata
    account_id: str
    agent_run_id: str
    account_data: dict

    # account_selector output
    icp_score: float | None
    priority_score: float | None
    icp_rationale: str | None
    verified_facts: dict
    inferred_assumptions: dict

    # stakeholder_mapper output
    contacts: list[dict]

    # strategy_decider output
    strategy: dict | None

    # outreach_generator output
    email_draft: str | None
    email_subject: str | None
    linkedin_draft: str | None

    # HITL
    hitl_approved: bool

    # reply_classifier output
    reply_text: str | None
    reply_classification: str | None
    reply_confidence: float | None
    response_draft: str | None
    escalate_to_human: bool

    # meeting_booker output
    meeting_status: str | None

    # audit
    audit_entries: list[dict]
