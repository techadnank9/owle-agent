import csv
import io
import uuid
from fastapi import APIRouter, UploadFile, File, Request, HTTPException

from ..supabase_client import get_supabase
from ..agents.graph import build_outreach_graph

router = APIRouter()


@router.get("/")
def list_accounts():
    result = (
        get_supabase()
        .table("accounts")
        .select("*")
        .order("priority_score", desc=True, nullsfirst=False)
        .execute()
    )
    return result.data


@router.post("/upload")
async def upload_accounts(request: Request, file: UploadFile = File(...)):
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    supabase = get_supabase()
    graph = build_outreach_graph(request.app.state.checkpointer)

    results = []
    for row in reader:
        account_data = {k.strip(): v.strip() for k, v in row.items() if v and v.strip()}
        name = account_data.get("name") or account_data.get("facility_name") or "Unknown"

        bed_count = None
        raw_beds = account_data.get("bed_count") or account_data.get("beds")
        if raw_beds:
            try:
                bed_count = int(raw_beds) or None
            except ValueError:
                pass

        acc_result = supabase.table("accounts").insert({
            "name": name,
            "type": account_data.get("type", "skilled_nursing_facility"),
            "bed_count": bed_count,
            "location": account_data.get("location") or account_data.get("city"),
            "raw_data": account_data,
            "status": "new",
        }).execute()
        account_id = acc_result.data[0]["id"]

        thread_id = str(uuid.uuid4())
        run_result = supabase.table("agent_runs").insert({
            "account_id": account_id,
            "graph_thread_id": thread_id,
            "current_node": "account_selector",
            "status": "running",
        }).execute()
        agent_run_id = run_result.data[0]["id"]

        initial_state = {
            "account_id": account_id,
            "agent_run_id": agent_run_id,
            "account_data": account_data,
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
        config = {"configurable": {"thread_id": thread_id}}

        try:
            final_state = graph.invoke(initial_state, config)
            supabase.table("agent_runs").update({
                "status": "waiting_hitl",
                "current_node": "outreach_generator",
            }).eq("id", agent_run_id).execute()
            results.append({
                "account_id": account_id,
                "name": name,
                "icp_score": final_state.get("icp_score"),
                "priority_score": final_state.get("priority_score"),
                "recommendation": (final_state.get("strategy") or {}).get("action"),
                "thread_id": thread_id,
            })
        except Exception as e:
            supabase.table("agent_runs").update({"status": "failed"}).eq("id", agent_run_id).execute()
            results.append({"account_id": account_id, "name": name, "error": str(e)})

    return {"processed": len(results), "accounts": results}
