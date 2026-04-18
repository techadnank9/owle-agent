import csv
import io
import uuid
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Request, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel

from ..supabase_client import get_supabase
from ..agents.graph import build_outreach_graph, build_enrich_graph
from ..config import settings

router = APIRouter()


class EmailEntry(BaseModel):
    email: str
    name: str | None = None
    location: str | None = None
    bed_count: int | None = None


class PasteEmailsRequest(BaseModel):
    emails: List[EmailEntry]


def _run_enrich_for_account(checkpointer, account_id: str, agent_run_id: str, account_data: dict, thread_id: str):
    """Runs only web_enricher + account_selector — no outreach generation."""
    supabase = get_supabase()
    graph = build_enrich_graph(checkpointer)
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
        graph.invoke(initial_state, config)
        try:
            supabase.table("agent_runs").update({"status": "completed", "current_node": "account_selector"}).eq("id", agent_run_id).execute()
        except Exception:
            pass
    except Exception as e:
        try:
            supabase.table("agent_runs").update({"status": "failed"}).eq("id", agent_run_id).execute()
        except Exception:
            pass
        print(f"[enrich] failed for account {account_id}: {e}")


@router.post("/{account_id}/enrich")
async def enrich_account(account_id: str, request: Request, background_tasks: BackgroundTasks):
    """Re-run CMS enrichment + re-score only (no outreach regeneration)."""
    supabase = get_supabase()
    result = supabase.table("accounts").select("*").eq("id", account_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account = result.data
    account_data = dict(account.get("raw_data") or {})
    account_data["name"] = account_data.get("name") or account.get("name", "")
    account_data["location"] = account_data.get("location") or account.get("location") or ""

    thread_id = str(uuid.uuid4())
    run_result = supabase.table("agent_runs").insert({
        "account_id": account_id,
        "graph_thread_id": thread_id,
        "current_node": "web_enricher",
        "status": "running",
    }).execute()
    agent_run_id = run_result.data[0]["id"]

    background_tasks.add_task(
        _run_enrich_for_account,
        request.app.state.checkpointer,
        account_id,
        agent_run_id,
        account_data,
        thread_id,
    )

    return {"status": "queued", "agent_run_id": agent_run_id, "thread_id": thread_id,
            "message": "Re-enrichment and re-scoring started in background."}


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


# ---------------------------------------------------------------------------
# SNF Search via Apify Google Maps Scraper
# ---------------------------------------------------------------------------

class FacilityImport(BaseModel):
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    website: str | None = None
    place_id: str | None = None


class BulkImportRequest(BaseModel):
    facilities: List[FacilityImport]


@router.get("/search")
async def search_snfs(
    query: str = Query(..., description="Search query e.g. 'skilled nursing facility'"),
    state: str = Query(..., description="US state abbreviation e.g. 'CA'"),
    city: Optional[str] = Query(None, description="Optional city"),
    max_results: int = Query(20, ge=1, le=50),
):
    if not settings.apify_api_key:
        raise HTTPException(status_code=400, detail="APIFY_API_KEY not configured")

    from apify_client import ApifyClient

    client = ApifyClient(settings.apify_api_key)

    location = f"{city}, {state}" if city else state

    run_input = {
        "searchStringsArray": [query],
        "locationQuery": location,
        "maxCrawledPlacesPerSearch": max_results,
        "language": "en",
        "outputNameSuffix": "",
        "includeWebResults": False,
        "scrapeDirectories": False,
        "deep": False,
        "skipClosedPlaces": True,
    }

    try:
        run = client.actor("nwua9Gu5YrADL7ZDj").call(run_input=run_input)
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apify error: {str(e)}")

    results = []
    for item in items:
        if item.get("permanentlyClosed") or item.get("temporarilyClosed"):
            continue
        results.append({
            "name": item.get("title", ""),
            "address": item.get("address", ""),
            "city": item.get("city", ""),
            "state": item.get("state", ""),
            "phone": item.get("phone", ""),
            "website": item.get("website", ""),
            "rating": item.get("totalScore"),
            "reviews_count": item.get("reviewsCount", 0),
            "place_id": item.get("placeId", ""),
            "maps_url": item.get("url", ""),
            "category": item.get("categoryName", ""),
        })

    return {"query": query, "location": location, "count": len(results), "results": results}


def _run_agent_for_account(checkpointer, account_id: str, agent_run_id: str, account_data: dict, thread_id: str):
    """Runs in a background thread — does not block the HTTP response."""
    supabase = get_supabase()
    graph = build_outreach_graph(checkpointer)
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
        graph.invoke(initial_state, config)
        try:
            supabase.table("agent_runs").update({
                "status": "waiting_hitl",
                "current_node": "outreach_generator",
            }).eq("id", agent_run_id).execute()
        except Exception:
            pass
    except Exception as e:
        try:
            supabase.table("agent_runs").update({"status": "failed"}).eq("id", agent_run_id).execute()
        except Exception:
            pass
        print(f"[bulk-import] agent failed for account {account_id}: {e}")


@router.post("/bulk-import")
async def bulk_import(request: Request, background_tasks: BackgroundTasks, body: BulkImportRequest):
    if not body.facilities:
        raise HTTPException(status_code=400, detail="No facilities provided")

    supabase = get_supabase()

    results = []
    for facility in body.facilities:
        location = ", ".join(filter(None, [facility.city, facility.state]))
        account_data: dict = {
            "name": facility.name,
            "type": "skilled_nursing_facility",
        }
        if facility.address:
            account_data["address"] = facility.address
        if location:
            account_data["location"] = location
        if facility.phone:
            account_data["phone"] = facility.phone
        if facility.website:
            account_data["website"] = facility.website

        acc_insert: dict = {
            "name": facility.name,
            "type": "skilled_nursing_facility",
            "raw_data": account_data,
            "status": "new",
        }
        if location:
            acc_insert["location"] = location

        acc_result = supabase.table("accounts").insert(acc_insert).execute()
        account_id = acc_result.data[0]["id"]

        thread_id = str(uuid.uuid4())
        run_result = supabase.table("agent_runs").insert({
            "account_id": account_id,
            "graph_thread_id": thread_id,
            "current_node": "account_selector",
            "status": "running",
        }).execute()
        agent_run_id = run_result.data[0]["id"]

        background_tasks.add_task(
            _run_agent_for_account,
            request.app.state.checkpointer,
            account_id,
            agent_run_id,
            account_data,
            thread_id,
        )
        results.append({"account_id": account_id, "name": facility.name, "thread_id": thread_id, "status": "queued"})

    return {"processed": len(results), "accounts": results, "message": "Accounts created. Agent pipeline running in background."}


@router.post("/add-emails")
async def add_emails(request: Request, body: PasteEmailsRequest):
    if not body.emails:
        raise HTTPException(status_code=400, detail="No emails provided")

    supabase = get_supabase()
    graph = build_outreach_graph(request.app.state.checkpointer)

    results = []
    for entry in body.emails:
        email = entry.email.strip()
        if not email:
            continue
        domain = email.split("@")[-1].split(".")[0].replace("-", " ").title() if "@" in email else "Unknown"
        name = entry.name or domain
        account_data: dict = {"email": email, "name": name}
        if entry.location:
            account_data["location"] = entry.location
        if entry.bed_count:
            account_data["bed_count"] = entry.bed_count

        acc_insert: dict = {
            "name": name,
            "type": "skilled_nursing_facility",
            "raw_data": account_data,
            "status": "new",
        }
        if entry.location:
            acc_insert["location"] = entry.location
        if entry.bed_count:
            acc_insert["bed_count"] = entry.bed_count
        acc_result = supabase.table("accounts").insert(acc_insert).execute()
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
                "email": email,
                "name": name,
                "icp_score": final_state.get("icp_score"),
                "priority_score": final_state.get("priority_score"),
                "thread_id": thread_id,
            })
        except Exception as e:
            supabase.table("agent_runs").update({"status": "failed"}).eq("id", agent_run_id).execute()
            results.append({"account_id": account_id, "email": email, "error": str(e)})

    return {"processed": len(results), "accounts": results}