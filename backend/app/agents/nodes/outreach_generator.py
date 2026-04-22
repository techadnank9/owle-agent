import json
from ..state import AgentState
from ...claude import call_claude
from ...supabase_client import write_audit_log, create_outreach_action

GENERATE_OUTREACH_TOOL = {
    "name": "generate_outreach",
    "description": "Draft personalized email and LinkedIn outreach for a skilled nursing facility",
    "input_schema": {
        "type": "object",
        "properties": {
            "email_subject": {"type": "string", "description": "Specific to their facility or role. Under 60 chars. No buzzwords."},
            "email_body": {"type": "string", "description": "120-180 words. 3 short paragraphs. Peer-to-peer tone."},
            "linkedin_message": {"type": "string", "description": "Under 300 chars. Direct, reference their role."},
            "rationale": {"type": "string"}
        },
        "required": ["email_subject", "email_body", "linkedin_message", "rationale"]
    }
}

OWLE_AI_CONTEXT = """
Owle AI — What We Do:
Owle AI is a HIPAA-compliant AI agent platform for healthcare teams. It works invisibly alongside
existing systems — no new logins, no training, no extra headcount required. Clinicians and staff
get hours back every day by offloading repetitive administrative tasks to the AI agent.

What it actually does (based on demo):
- Schedules specialist appointments by calling clinics directly
- Coordinates care tasks that currently require manual calls and EMR navigation
- Surfaces scheduling gaps, coverage opportunities, and workflow bottlenecks
- Handles the administrative back-and-forth that burns out staff

Key outcomes for facilities:
- Clinicians get 2+ hours back per day (currently lost to admin/documentation)
- Measurable reduction in staff burnout — 1 in 5 clinicians are planning to leave healthcare
- Stronger margins without new hires or replacing existing systems
- Results visible within 30 days, not months
- Zero disruption — works with what they already have

Business model:
- Pilot-first: limited Q4 pilot spots available
- No long-term commitment required to start
- Free ROI calculator available to show projected savings

Clinician burnout context (use as relevant):
- 63% of clinicians report burnout symptoms
- $4.6B annual cost of clinician turnover industry-wide
- 2+ hours per day lost to administrative tasks per clinician

For SNFs specifically:
- High staff turnover is a persistent pain — DONs and administrators deal with this constantly
- CMS staffing requirements create documentation pressure on nursing staff
- Any tool that reduces admin burden and helps retain staff has direct margin impact
"""

ANGLE_INSTRUCTIONS = {
    "staffing": "Focus on staff retention and reducing burnout — SNFs have chronic turnover problems that cost them significantly.",
    "documentation": "Focus on the 2+ hours per day clinicians spend on admin/documentation that Owle AI eliminates.",
    "margins": "Focus on doing more with same headcount — no new hires needed, results in 30 days.",
    "care_coordination": "Focus on the AI agent's ability to coordinate specialist appointments and care tasks automatically.",
    "operational_efficiency": "Focus on removing the administrative back-and-forth that slows down the care team.",
}


def outreach_generator_node(state: AgentState) -> dict:
    account = state["account_data"]
    contacts = state.get("contacts", [])
    strategy = state.get("strategy", {})
    primary_contact = contacts[0] if contacts else {}
    angle = (strategy.get("angle") or "staffing").lower()

    # Find most relevant angle instruction
    angle_guidance = ""
    for key, instruction in ANGLE_INSTRUCTIONS.items():
        if key in angle:
            angle_guidance = instruction
            break
    if not angle_guidance:
        angle_guidance = ANGLE_INSTRUCTIONS["staffing"]

    # Persona-specific guidance
    title = (primary_contact.get("title") or "Administrator").lower()
    if "don" in title or "nursing" in title:
        persona_note = "Contact is Director of Nursing — focus on staff burnout, documentation burden, and retaining nursing staff."
    elif "administrator" in title:
        persona_note = "Contact is Administrator — connect to staff retention costs, margin impact, and operational efficiency."
    elif "coo" in title or "operations" in title or "vp" in title:
        persona_note = "Contact is operations leader — focus on margin improvement, headcount efficiency, and measurable results in 30 days."
    elif "ceo" in title or "president" in title:
        persona_note = "Contact is executive — frame around competitive differentiation, staff retention strategy, and margin growth."
    else:
        persona_note = "Lead with staff time savings and burnout reduction — universally relevant in SNF settings."

    # CMS/facility context for personalization
    verified = state.get("verified_facts", {})
    cms_notes = []
    if account.get("bed_count"):
        cms_notes.append(f"{account['bed_count']}-bed facility")
    if verified.get("cms_overall_rating"):
        cms_notes.append(f"CMS rating {verified['cms_overall_rating']}/5")
    if verified.get("nursing_staff_turnover_pct"):
        cms_notes.append(f"nurse turnover {verified['nursing_staff_turnover_pct']}%")
    facility_context = ", ".join(cms_notes) if cms_notes else "SNF"

    prompt = f"""Draft personalized outreach for this skilled nursing facility.

=== FACILITY ===
Name: {account.get('name')}
Location: {account.get('location', '')}
Context: {facility_context}
Website: {account.get('website', 'unknown')}

=== CONTACT ===
Role: {primary_contact.get('title', 'Administrator')}
Persona note: {persona_note}

=== STRATEGY ===
Channel: {strategy.get('channel', 'email')}
Angle: {angle}
Angle guidance: {angle_guidance}

=== OWLE AI PRODUCT CONTEXT ===
{OWLE_AI_CONTEXT}

=== EMAIL GUIDELINES ===
Subject line:
- Specific to their role or facility situation — NOT generic "AI for healthcare"
- Examples of good subjects:
  * "Cutting admin time for [Facility Name]'s nursing team"
  * "Question about staff retention at [Facility Name]"
  * "30-day pilot: giving your DON 2 hours back a day"
- Under 60 characters

Email body (120-180 words, 3 short paragraphs):
Paragraph 1 — Opening hook (1-2 sentences):
  Acknowledge something specific about their facility or role. Reference a real pain — not a platitude.
  Do NOT open with "I hope this finds you well" or "My name is X and I work at..."
  Open with the problem or an observation. Example: "Your nurses are probably spending 2+ hours a day on tasks that have nothing to do with patients."

Paragraph 2 — What Owle AI does (2-3 sentences):
  Be specific and concrete. Name what it actually does: schedules appointments, coordinates care tasks,
  handles the administrative back-and-forth. Mention it works with existing systems — no new logins,
  no training. HIPAA compliant. Results in 30 days.

Paragraph 3 — CTA (1-2 sentences):
  Ask for a 20-minute call. Mention limited Q4 pilot spots. Keep it low-pressure.

Tone: peer-to-peer. Not a vendor pitch. No buzzwords like "revolutionize", "transform", "cutting-edge".
Write as if a founder (not a sales rep) is reaching out directly.

LinkedIn message:
- Under 300 chars
- Direct, reference their role/facility by name
- No generic opener. Get to the point in 2 sentences.

Call generate_outreach."""

    msg = call_claude(prompt, tools=[GENERATE_OUTREACH_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    if not tool_use:
        email_subject = f"Reducing admin time for {account.get('name', 'your team')}"
        email_body = (
            "Your nursing staff are likely spending 2+ hours a day on tasks that have nothing to do with patient care — "
            "scheduling, documentation, coordination calls.\n\n"
            "Owle AI is a HIPAA-compliant AI agent that handles that administrative back-and-forth automatically. "
            "It works with your existing systems — no new logins, no training, no disruption. "
            "Facilities typically see results within 30 days.\n\n"
            "Would you be open to a 20-minute call to see if it's relevant for your team? "
            "We have limited Q4 pilot spots available."
        )
        linkedin_message = (
            f"Hi — reaching out about Owle AI, an AI agent that gives nursing teams 2+ hours back per day "
            f"by handling admin tasks automatically. HIPAA-compliant, no new systems. Worth a quick chat?"
        )
        rationale = "Fallback: generation tool call did not return output"
    else:
        email_subject = tool_use.input["email_subject"]
        email_body = tool_use.input["email_body"]
        linkedin_message = tool_use.input["linkedin_message"]
        rationale = tool_use.input["rationale"]

    # Look up primary contact for this account
    from ...supabase_client import get_supabase
    contact_id = None
    try:
        cr = get_supabase().table("contacts").select("id").eq("account_id", state["account_id"]).order("confidence", desc=True).limit(1).execute()
        if cr.data:
            contact_id = cr.data[0]["id"]
    except Exception:
        pass

    create_outreach_action({
        "account_id": state["account_id"],
        "contact_id": contact_id,
        "channel": "email",
        "subject": email_subject,
        "body": email_body,
        "status": "pending_approval",
    })

    create_outreach_action({
        "account_id": state["account_id"],
        "contact_id": contact_id,
        "channel": "linkedin",
        "body": linkedin_message,
        "status": "pending_approval",
    })

    entry = {
        "node": "outreach_generator",
        "action": f"drafted email '{email_subject}' and LinkedIn message",
        "rationale": rationale,
        "verified_facts": {},
        "inferred_assumptions": {},
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="outreach_generator",
        action=entry["action"],
        rationale=rationale,
        verified_facts={},
        inferred_assumptions={},
    )

    return {
        "email_draft": email_body,
        "email_subject": email_subject,
        "linkedin_draft": linkedin_message,
        "hitl_approved": False,
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
