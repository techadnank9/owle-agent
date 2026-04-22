from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..supabase_client import get_supabase
from ..agentmail_client import send_email

router = APIRouter()


@router.get("/queue")
def get_queue():
    result = (
        get_supabase()
        .table("outreach_actions")
        .select("*, accounts(name, icp_score, priority_score, location)")
        .eq("status", "pending_approval")
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/{outreach_id}/approve")
def approve_outreach(outreach_id: str):
    result = (
        get_supabase()
        .table("outreach_actions")
        .update({"status": "approved"})
        .eq("id", outreach_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Outreach action not found")
    return {"status": "approved", "outreach_id": outreach_id}


@router.post("/{outreach_id}/reject")
def reject_outreach(outreach_id: str):
    result = (
        get_supabase()
        .table("outreach_actions")
        .update({"status": "draft"})
        .eq("id", outreach_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Outreach action not found")
    return {"status": "returned_to_draft", "outreach_id": outreach_id}


class SendRequest(BaseModel):
    to_email: Optional[str] = None


@router.post("/{outreach_id}/send")
def send_outreach(outreach_id: str, body: SendRequest = SendRequest()):
    supabase = get_supabase()
    result = (
        supabase.table("outreach_actions")
        .select("*, contacts(email, name)")
        .eq("id", outreach_id)
        .eq("status", "approved")
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Approved outreach action not found")

    action = result.data[0]

    # Use explicitly provided email, else fall back to contact's email
    to_email = body.to_email or (action.get("contacts") or {}).get("email")

    if not to_email:
        raise HTTPException(status_code=422, detail="No email specified — select a recipient and try again")

    message_id, thread_id = send_email(
        to=to_email,
        subject=action["subject"] or "",
        body=action["body"] or "",
    )

    supabase.table("outreach_actions").update({
        "status": "sent",
        "sent_at": "now()",
        "gmail_thread_id": thread_id,  # AgentMail thread_id — used by reply webhook to match incoming replies
    }).eq("id", outreach_id).execute()

    return {"status": "sent", "outreach_id": outreach_id, "to": to_email, "message_id": message_id, "thread_id": thread_id}


@router.get("/account/{account_id}")
def get_account_outreach(account_id: str):
    result = (
        get_supabase()
        .table("outreach_actions")
        .select("*")
        .eq("account_id", account_id)
        .order("created_at")
        .execute()
    )
    return result.data
