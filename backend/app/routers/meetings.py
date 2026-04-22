import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..supabase_client import get_supabase, create_outreach_action
from ..claude import call_claude

router = APIRouter()
logger = logging.getLogger(__name__)


class BookMeetingRequest(BaseModel):
    account_id: str
    proposed_time: str


@router.post("/book")
def book_meeting(body: BookMeetingRequest):
    supabase = get_supabase()
    existing = (
        supabase.table("meetings")
        .select("id")
        .eq("account_id", body.account_id)
        .neq("status", "cancelled")
        .limit(1)
        .execute()
    )
    if existing.data:
        meeting_id = existing.data[0]["id"]
        supabase.table("meetings").update({
            "status": "confirmed",
            "confirmed_at": "now()",
            "proposed_times": [body.proposed_time],
        }).eq("id", meeting_id).execute()
    else:
        res = supabase.table("meetings").insert({
            "account_id": body.account_id,
            "status": "confirmed",
            "confirmed_at": "now()",
            "proposed_times": [body.proposed_time],
        }).execute()
        meeting_id = res.data[0]["id"] if res.data else None

    supabase.table("accounts").update({"status": "meeting_booked"}).eq("id", body.account_id).execute()

    # Look up primary contact for this account
    contact_res = (
        supabase.table("contacts")
        .select("id, email, name")
        .eq("account_id", body.account_id)
        .limit(1)
        .execute()
    )
    contact = contact_res.data[0] if contact_res.data else {}

    # Get account name + location for Calendar event
    acct_res = supabase.table("accounts").select("name, location").eq("id", body.account_id).limit(1).execute()
    acct_name = acct_res.data[0]["name"] if acct_res.data else "Prospect"
    acct_location = acct_res.data[0].get("location") if acct_res.data else None

    # Create Google Calendar event with Meet link
    calendar_result: dict = {"meet_link": None, "event_link": None}
    try:
        from ..calendar_client import create_meeting_event
        calendar_result = create_meeting_event(
            summary=f"Owle AI × {acct_name}",
            proposed_time_str=body.proposed_time,
            attendee_email=contact.get("email"),
            location=acct_location,
        )
        meet_link = calendar_result.get("meet_link")
        if meet_link and meeting_id:
            supabase.table("meetings").update({"calendar_link": meet_link}) \
                .eq("id", meeting_id).execute()
    except Exception as e:
        logger.warning("Calendar event creation failed: %s", e)

    # Create confirmation email draft → Ready to Send (status="approved"), deduplicated
    outreach_action_id: str | None = None
    try:
        existing_draft = supabase.table("outreach_actions") \
            .select("id") \
            .eq("account_id", body.account_id) \
            .eq("status", "approved") \
            .ilike("subject", "Meeting Confirmed%") \
            .limit(1).execute()
        if existing_draft.data:
            outreach_action_id = existing_draft.data[0]["id"]
        else:
            meet_link = calendar_result.get("meet_link") or ""
            link_line = f"\nJoin via Google Meet: {meet_link}\n" if meet_link else ""
            subject = f"Meeting Confirmed: {body.proposed_time}"
            email_body = f"""Hi,

Thanks for your time — confirming our meeting scheduled for {body.proposed_time}.{link_line}
Looking forward to connecting!

Best,
Owle AI"""
            draft = create_outreach_action({
                "account_id": body.account_id,
                "contact_id": contact.get("id"),
                "channel": "email",
                "subject": subject,
                "body": email_body,
                "status": "approved",
            })
            outreach_action_id = draft.get("id") if draft else None
    except Exception as e:
        logger.warning("Confirmation email draft creation failed: %s", e)

    return {
        "status": "booked",
        "proposed_time": body.proposed_time,
        "meet_link": calendar_result.get("meet_link"),
        "outreach_action_id": outreach_action_id,
    }


@router.get("/")
def list_meetings():
    result = (
        get_supabase()
        .table("meetings")
        .select("*, accounts(name, location), contacts(name, title, email)")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/{meeting_id}/confirm")
def confirm_meeting(meeting_id: str):
    supabase = get_supabase()
    result = supabase.table("meetings").select("*").eq("id", meeting_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = result.data[0]
    supabase.table("meetings").update({
        "status": "confirmed",
        "confirmed_at": "now()",
    }).eq("id", meeting_id).execute()

    supabase.table("accounts").update({"status": "meeting_booked"}).eq("id", meeting["account_id"]).execute()

    return {"status": "confirmed", "meeting_id": meeting_id}


@router.post("/{meeting_id}/cancel")
def cancel_meeting(meeting_id: str):
    supabase = get_supabase()
    result = supabase.table("meetings").select("*").eq("id", meeting_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    supabase.table("meetings").update({"status": "cancelled"}).eq("id", meeting_id).execute()
    return {"status": "cancelled", "meeting_id": meeting_id}


class CompleteRequest(BaseModel):
    outcome: str  # won | lost | nurture
    notes: str = ""


@router.post("/{meeting_id}/complete")
def complete_meeting(meeting_id: str, body: CompleteRequest):
    if body.outcome not in ("won", "lost", "nurture"):
        raise HTTPException(status_code=400, detail="outcome must be won, lost, or nurture")

    supabase = get_supabase()
    result = supabase.table("meetings").select("*, accounts(name, location), contacts(id, name, email)").eq("id", meeting_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = result.data[0]
    if meeting["status"] not in ("confirmed",):
        raise HTTPException(status_code=400, detail="Only confirmed meetings can be completed")

    account_status_map = {"won": "customer", "lost": "churned", "nurture": "nurture"}
    supabase.table("meetings").update({
        "status": "completed",
        "completed_at": "now()",
        "outcome": body.outcome,
        "notes": body.notes or None,
    }).eq("id", meeting_id).execute()
    supabase.table("accounts").update({
        "status": account_status_map[body.outcome]
    }).eq("id", meeting["account_id"]).execute()

    acct_name = (meeting.get("accounts") or {}).get("name", "Prospect")
    contact = meeting.get("contacts") or {}
    confirmed_time = meeting.get("confirmed_at") or (meeting.get("proposed_times") or [None])[0] or "recently"
    notes_context = f"\nMeeting notes: {body.notes}" if body.notes else ""

    subject = f"Great connecting, {acct_name} — next steps"
    email_body = (
        f"Hi {contact.get('name', 'there')},\n\nThanks for your time today!\n\n"
        f"We'll send over a pilot proposal shortly.\n\nBest,\nThe Owle AI Team"
    )
    try:
        prompt = f"""Draft a short, warm follow-up email after a sales meeting.

Account: {acct_name}
Contact: {contact.get('name', 'there')}
Meeting time: {confirmed_time}
Outcome: {body.outcome}{notes_context}
Product: Owle AI — HIPAA-compliant AI agent for healthcare teams, automates admin tasks, gives clinicians 2+ hours back per day.

Write a subject line and email body. Be concise, reference the meeting, include a clear next step. Sign as "The Owle AI Team".
Format:
SUBJECT: <subject line>
BODY:
<email body>"""
        msg = call_claude(prompt)
        text = next((b.text for b in msg.content if hasattr(b, "text")), "")
        if "SUBJECT:" in text and "BODY:" in text:
            subject = text.split("SUBJECT:")[1].split("\n")[0].strip()
            email_body = text.split("BODY:")[1].strip()
    except Exception as e:
        logger.warning("Claude follow-up draft failed: %s", e)

    outreach_action_id = None
    try:
        draft = create_outreach_action({
            "account_id": meeting["account_id"],
            "contact_id": contact.get("id"),
            "channel": "email",
            "subject": subject,
            "body": email_body,
            "status": "approved",
        })
        outreach_action_id = draft.get("id") if draft else None
    except Exception as e:
        logger.warning("Follow-up draft creation failed: %s", e)

    return {
        "status": "completed",
        "meeting_id": meeting_id,
        "outcome": body.outcome,
        "outreach_action_id": outreach_action_id,
        "follow_up_subject": subject,
    }


class GenerateNotesRequest(BaseModel):
    notes: str
    account_name: str = ""
    instruction: str = ""


@router.post("/{meeting_id}/generate-notes")
def generate_meeting_notes(meeting_id: str, body: GenerateNotesRequest):
    fallback = body.notes
    try:
        if body.instruction:
            prompt = f"""You are refining sales meeting notes for {body.account_name or "a prospect"}.

Current notes:
{body.notes}

User instruction: {body.instruction}

Apply the instruction to improve the notes. Keep all facts intact. Return only the updated notes."""
        else:
            prompt = f"""A sales rep has just finished a meeting with {body.account_name or "a prospect"} about Owle AI (HIPAA-compliant AI agent for healthcare admin automation).

Their raw notes:
{body.notes}

Rewrite these notes to be clear, structured, and professional. Keep all facts intact. Use this format:
**What was discussed**
...

**Key points / objections**
...

**Agreed next steps**
...

Return only the rewritten notes."""
        msg = call_claude(prompt)
        generated = next((b.text.strip() for b in msg.content if hasattr(b, "text")), fallback)
    except Exception as e:
        logger.warning("Notes generation failed: %s", e)
        generated = fallback

    return {"generated_notes": generated}
