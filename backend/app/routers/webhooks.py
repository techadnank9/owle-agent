import base64
import json
import uuid
from fastapi import APIRouter, Request

from ..supabase_client import get_supabase
from ..agents.graph import build_reply_graph

router = APIRouter()


@router.post("/gmail")
async def gmail_webhook(request: Request):
    body = await request.json()

    try:
        message_data = body.get("message", {})
        encoded = message_data.get("data", "")
        decoded = json.loads(base64.b64decode(encoded).decode("utf-8"))
    except Exception:
        decoded = body

    email_body = decoded.get("body", "") or decoded.get("text", "") or str(decoded)
    thread_id_gmail = decoded.get("threadId") or decoded.get("thread_id")

    supabase = get_supabase()

    action_result = (
        supabase.table("outreach_actions")
        .select("*, accounts(*)")
        .eq("gmail_thread_id", thread_id_gmail)
        .limit(1)
        .execute()
    )

    if not action_result.data:
        return {"status": "unmatched", "thread_id": thread_id_gmail}

    action = action_result.data[0]
    account = action["accounts"]
    account_id = account["id"]

    reply_result = supabase.table("replies").insert({
        "outreach_action_id": action["id"],
        "body": email_body,
    }).execute()

    reply_thread_id = str(uuid.uuid4())
    run_result = supabase.table("agent_runs").insert({
        "account_id": account_id,
        "graph_thread_id": reply_thread_id,
        "current_node": "reply_classifier",
        "status": "running",
    }).execute()
    agent_run_id = run_result.data[0]["id"]

    reply_state = {
        "account_id": account_id,
        "agent_run_id": agent_run_id,
        "account_data": account,
        "icp_score": account.get("icp_score"),
        "priority_score": account.get("priority_score"),
        "icp_rationale": None,
        "verified_facts": {},
        "inferred_assumptions": {},
        "contacts": [],
        "strategy": None,
        "email_draft": None,
        "email_subject": None,
        "linkedin_draft": None,
        "hitl_approved": False,
        "reply_text": email_body,
        "reply_classification": None,
        "reply_confidence": None,
        "response_draft": None,
        "meeting_status": None,
        "audit_entries": [],
    }
    config = {"configurable": {"thread_id": reply_thread_id}}

    try:
        graph = build_reply_graph(request.app.state.checkpointer)
        final_state = graph.invoke(reply_state, config)

        supabase.table("replies").update({
            "classification": final_state.get("reply_classification"),
            "confidence": final_state.get("reply_confidence"),
            "response_draft": final_state.get("response_draft"),
        }).eq("id", reply_result.data[0]["id"]).execute()

        if final_state.get("meeting_status") in ("confirmed", "proposed"):
            supabase.table("accounts").update({"status": "meeting_booked"}).eq("id", account_id).execute()

        supabase.table("agent_runs").update({"status": "completed"}).eq("id", agent_run_id).execute()

    except Exception as e:
        supabase.table("agent_runs").update({"status": "failed"}).eq("id", agent_run_id).execute()
        return {"status": "error", "detail": str(e)}

    return {"status": "processed", "classification": final_state.get("reply_classification")}
