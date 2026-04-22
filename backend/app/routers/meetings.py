import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..supabase_client import get_supabase, create_outreach_action

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
        supabase.table("meetings").update({
            "status": "confirmed",
            "confirmed_at": "now()",
            "proposed_times": [body.proposed_time],
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("meetings").insert({
            "account_id": body.account_id,
            "status": "confirmed",
            "confirmed_at": "now()",
            "proposed_times": [body.proposed_time],
        }).execute()

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

    # Get account name for Calendar event title
    acct_res = supabase.table("accounts").select("name").eq("id", body.account_id).limit(1).execute()
    acct_name = acct_res.data[0]["name"] if acct_res.data else "Prospect"

    # Create Google Calendar event with Meet link
    calendar_result: dict = {"meet_link": None, "event_link": None}
    try:
        from ..calendar_client import create_meeting_event
        calendar_result = create_meeting_event(
            summary=f"Owle AI × {acct_name}",
            proposed_time_str=body.proposed_time,
            attendee_email=contact.get("email"),
        )
        meet_link = calendar_result.get("meet_link")
        if meet_link and existing.data:
            supabase.table("meetings").update({"calendar_link": meet_link}) \
                .eq("id", existing.data[0]["id"]).execute()
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
