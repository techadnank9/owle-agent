import csv
import io
import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Request, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel

from ..supabase_client import get_supabase
from ..agents.graph import build_outreach_graph, build_enrich_graph
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


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
    """Re-run enrichment pipeline. Runs full pipeline (contacts + outreach) if no drafts exist yet,
    otherwise runs enrich-only (re-score without overwriting existing outreach)."""
    supabase = get_supabase()
    result = supabase.table("accounts").select("*").eq("id", account_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account = result.data
    account_data = dict(account.get("raw_data") or {})
    account_data["name"] = account_data.get("name") or account.get("name", "")
    account_data["location"] = account_data.get("location") or account.get("location") or ""

    # Check if account already has outreach drafts — if so, enrich-only to avoid overwriting
    existing_outreach = supabase.table("outreach_actions").select("id").eq("account_id", account_id).limit(1).execute()
    has_outreach = bool(existing_outreach.data)

    thread_id = str(uuid.uuid4())
    run_result = supabase.table("agent_runs").insert({
        "account_id": account_id,
        "graph_thread_id": thread_id,
        "current_node": "web_enricher",
        "status": "running",
    }).execute()
    agent_run_id = run_result.data[0]["id"]

    if has_outreach:
        background_tasks.add_task(
            _run_enrich_for_account,
            request.app.state.checkpointer,
            account_id,
            agent_run_id,
            account_data,
            thread_id,
        )
        message = "Re-enrichment and re-scoring started (outreach drafts preserved)."
    else:
        background_tasks.add_task(
            _run_agent_for_account,
            request.app.state.checkpointer,
            account_id,
            agent_run_id,
            account_data,
            thread_id,
        )
        message = "Full pipeline started — contacts and outreach drafts will be generated."

    return {"status": "queued", "agent_run_id": agent_run_id, "thread_id": thread_id, "message": message}


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
    # CMS fields — populated when importing from CMS search
    beds: int | None = None
    stars: int | None = None
    staffing_stars: int | None = None
    nurse_turnover_pct: float | None = None
    rn_turnover_pct: float | None = None
    penalties: int | None = None
    fines_usd: float | None = None
    ownership: str | None = None
    chain: str | None = None
    ccn: str | None = None


class BulkImportRequest(BaseModel):
    facilities: List[FacilityImport]


CMS_API = "https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0"


def _cms_priority_score(rec: dict) -> float:
    """Deterministic priority score 0-100 based on CMS pain signals."""
    score = 0.0

    # Bed count (bigger = more value)
    try:
        beds = int(float(rec.get("number_of_certified_beds") or 0))
        if beds >= 200: score += 20
        elif beds >= 150: score += 15
        elif beds >= 100: score += 10
        elif beds >= 60: score += 5
    except (ValueError, TypeError):
        pass

    # Star rating — lower = more pain = higher priority
    try:
        stars = int(float(rec.get("overall_rating") or 5))
        score += (5 - stars) * 8  # 1 star → +32, 2 stars → +24, etc.
    except (ValueError, TypeError):
        pass

    # Nurse turnover
    try:
        turnover = float(rec.get("total_nursing_staff_turnover") or 0)
        if turnover >= 75: score += 20
        elif turnover >= 50: score += 15
        elif turnover >= 30: score += 8
    except (ValueError, TypeError):
        pass

    # RN turnover
    try:
        rn = float(rec.get("registered_nurse_turnover") or 0)
        if rn >= 50: score += 15
        elif rn >= 30: score += 10
        elif rn >= 15: score += 5
    except (ValueError, TypeError):
        pass

    # Penalties
    try:
        penalties = int(float(rec.get("total_number_of_penalties") or 0))
        score += min(penalties * 5, 20)
    except (ValueError, TypeError):
        pass

    # Fines
    try:
        fines = float(rec.get("total_amount_of_fines_in_dollars") or 0)
        if fines >= 100000: score += 10
        elif fines >= 10000: score += 5
    except (ValueError, TypeError):
        pass

    return min(score, 100.0)


@router.get("/cms-search")
async def cms_search_snfs(
    state: str = Query(..., description="US state abbreviation e.g. 'CA'"),
    city: Optional[str] = Query(None),
    min_beds: int = Query(100, ge=0),
    sort_by: str = Query("priority", description="priority|turnover|rn_turnover|penalties|stars|beds"),
    max_results: int = Query(50, ge=1, le=200),
    ownership: Optional[str] = Query(None, description="for_profit|non_profit|government"),
):
    """Search CMS Care Compare for SNFs with pain signals (turnover, penalties, low stars)."""
    import httpx

    params: dict = {
        "limit": 1000,
        "offset": 0,
        "conditions[0][property]": "state",
        "conditions[0][value]": state.upper(),
        "conditions[0][operator]": "=",
    }
    if city:
        params["conditions[1][property]"] = "citytown"
        params["conditions[1][value]"] = city.upper()
        params["conditions[1][operator]"] = "="

    try:
        r = httpx.get(CMS_API, params=params, timeout=15,
                      headers={"User-Agent": "owle-agent/1.0"})
        results = r.json().get("results", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CMS API error: {e}")

    # Filter by bed count and ownership
    ownership_map = {
        "for_profit": "for profit",
        "non_profit": "non profit",
        "government": "government",
    }
    ownership_filter = ownership_map.get(ownership.lower() if ownership else "", None)

    filtered = []
    for rec in results:
        try:
            beds = int(float(rec.get("number_of_certified_beds") or 0))
        except (ValueError, TypeError):
            beds = 0
        if beds < min_beds:
            continue
        if ownership_filter:
            rec_ownership = (rec.get("ownership_type") or "").lower()
            if not rec_ownership.startswith(ownership_filter):
                continue
        filtered.append(rec)

    # Sort
    sort_key_map = {
        "turnover": lambda r: float(r.get("total_nursing_staff_turnover") or 0),
        "rn_turnover": lambda r: float(r.get("registered_nurse_turnover") or 0),
        "penalties": lambda r: int(float(r.get("total_number_of_penalties") or 0)),
        "stars": lambda r: float(r.get("overall_rating") or 5),  # ascending = lowest first
        "beds": lambda r: int(float(r.get("number_of_certified_beds") or 0)),
        "priority": lambda r: _cms_priority_score(r),
    }
    key_fn = sort_key_map.get(sort_by, sort_key_map["priority"])
    reverse = sort_by != "stars"  # stars: lowest first (ascending)
    filtered.sort(key=key_fn, reverse=reverse)

    output = []
    for rec in filtered[:max_results]:
        try:
            beds = int(float(rec.get("number_of_certified_beds") or 0))
        except (ValueError, TypeError):
            beds = 0
        try:
            stars = int(float(rec.get("overall_rating") or 0))
        except (ValueError, TypeError):
            stars = 0
        try:
            turnover = round(float(rec.get("total_nursing_staff_turnover") or 0), 1)
        except (ValueError, TypeError):
            turnover = None
        try:
            rn_turnover = round(float(rec.get("registered_nurse_turnover") or 0), 1)
        except (ValueError, TypeError):
            rn_turnover = None
        try:
            penalties = int(float(rec.get("total_number_of_penalties") or 0))
        except (ValueError, TypeError):
            penalties = 0
        try:
            fines_usd = int(float(rec.get("total_amount_of_fines_in_dollars") or 0))
        except (ValueError, TypeError):
            fines_usd = 0

        city_val = (rec.get("citytown") or "").title()
        state_val = (rec.get("state") or "").upper()

        output.append({
            "name": (rec.get("provider_name") or "").title(),
            "location": f"{city_val}, {state_val}" if city_val else state_val,
            "city": city_val,
            "state": state_val,
            "beds": beds,
            "stars": stars,
            "staffing_stars": int(float(rec.get("staffing_rating") or 0)) if rec.get("staffing_rating") else None,
            "nurse_turnover_pct": turnover,
            "rn_turnover_pct": rn_turnover,
            "penalties": penalties,
            "fines_usd": fines_usd,
            "phone": rec.get("telephone_number", ""),
            "address": rec.get("provider_address", ""),
            "ownership": rec.get("ownership_type", ""),
            "chain": rec.get("chain_name", ""),
            "ccn": rec.get("cms_certification_number_ccn", ""),
            "priority_score": round(_cms_priority_score(rec), 1),
        })

    return {"state": state, "city": city, "min_beds": min_beds, "count": len(output), "results": output}


@router.get("/cms-cities")
async def get_cms_cities(state: str = Query(..., description="US state abbreviation e.g. 'CA'")):
    """Return sorted list of cities that have SNF records in CMS for given state."""
    import httpx

    params = {
        "limit": 1000,
        "offset": 0,
        "conditions[0][property]": "state",
        "conditions[0][value]": state.upper(),
        "conditions[0][operator]": "=",
    }
    try:
        r = httpx.get(CMS_API, params=params, timeout=15, headers={"User-Agent": "owle-agent/1.0"})
        results = r.json().get("results", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CMS API error: {e}")

    cities = sorted(set(
        (rec.get("citytown") or "").title()
        for rec in results
        if rec.get("citytown")
    ))
    return {"state": state, "cities": cities}


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

        # Carry CMS quality data through using same key names as _parse_cms_record
        # so web_enricher_node can skip the API re-lookup
        if facility.beds:
            account_data["bed_count"] = facility.beds
            account_data["cms_matched"] = True
        if facility.stars is not None:
            account_data["cms_overall_rating"] = str(facility.stars)
        if facility.staffing_stars is not None:
            account_data["cms_staffing_rating"] = str(facility.staffing_stars)
        if facility.nurse_turnover_pct is not None:
            account_data["nursing_staff_turnover_pct"] = str(facility.nurse_turnover_pct)
        if facility.rn_turnover_pct is not None:
            account_data["rn_turnover_pct"] = str(facility.rn_turnover_pct)
        if facility.penalties is not None:
            account_data["cms_total_penalties"] = str(facility.penalties)
        if facility.fines_usd is not None:
            account_data["cms_fines_total_usd"] = str(facility.fines_usd)
        if facility.ownership:
            account_data["ownership_type"] = facility.ownership
        if facility.chain:
            account_data["chain"] = facility.chain
        if facility.ccn:
            account_data["ccn"] = facility.ccn

        acc_insert: dict = {
            "name": facility.name,
            "type": "skilled_nursing_facility",
            "raw_data": account_data,
            "status": "new",
        }
        if location:
            acc_insert["location"] = location
        if facility.beds:
            acc_insert["bed_count"] = facility.beds

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


@router.post("/{account_id}/apollo-enrich")
async def apollo_enrich(account_id: str, source: str = "all"):
    supabase = get_supabase()

    acct_res = supabase.table("accounts").select("id, name, location").eq("id", account_id).limit(1).execute()
    if not acct_res.data:
        raise HTTPException(status_code=404, detail="Account not found")
    account = acct_res.data[0]

    people: list[dict] = []
    sources_tried: list[str] = []
    errors: list[str] = []

    run_all = source == "all"

    # Apollo
    if run_all or source == "apollo":
        try:
            from ..apollo_client import search_contacts as apollo_search
            apollo_people = apollo_search(account["name"], account.get("location"))
            for p in apollo_people:
                p["source"] = "apollo"
            people.extend(apollo_people)
            sources_tried.append("apollo")
        except Exception as e:
            logger.warning("Apollo search skipped for %s: %s", account["name"], e)
            errors.append(f"Apollo: {e}")

    # Hunter.io
    if run_all or source == "hunter":
        try:
            from ..hunter_client import search_contacts as hunter_search
            hunter_people = hunter_search(account["name"])
            existing_emails = {p["email"] for p in people if p.get("email")}
            for p in hunter_people:
                if p.get("email") and p["email"] in existing_emails:
                    continue
                people.append(p)
            sources_tried.append("hunter")
        except Exception as e:
            logger.warning("Hunter search skipped for %s: %s", account["name"], e)
            errors.append(f"Hunter: {e}")

    # Apify email finder
    if run_all or source == "apify":
        try:
            from ..apify_leads_client import search_contacts as apify_search
            apify_people = apify_search(account["name"], account.get("location"))
            existing_emails = {p["email"] for p in people if p.get("email")}
            for p in apify_people:
                if p.get("email") and p["email"] in existing_emails:
                    continue
                people.append(p)
            sources_tried.append("apify")
        except Exception as e:
            logger.warning("Apify search skipped for %s: %s", account["name"], e)
            errors.append(f"Apify: {e}")

    # Only surface errors if nothing came back and a non-Apollo source failed
    non_apollo_errors = [e for e in errors if not e.startswith("Apollo")]
    if not people and non_apollo_errors:
        raise HTTPException(status_code=502, detail="; ".join(non_apollo_errors))

    upserted = []
    for p in people:
        existing = (
            supabase.table("contacts")
            .select("id")
            .eq("account_id", account_id)
            .eq("name", p["name"])
            .limit(1)
            .execute()
        )
        payload = {
            "account_id": account_id,
            "name": p["name"],
            "title": p.get("title", ""),
            "email": p.get("email"),
            "linkedin_url": p.get("linkedin_url"),
            "source": p.get("source", "unknown"),
            "confidence": 0.85 if p.get("source") == "apollo" else (0.75 if p.get("source") == "hunter" else 0.55),
        }
        if existing.data:
            supabase.table("contacts").update(payload).eq("id", existing.data[0]["id"]).execute()
            upserted.append({**payload, "id": existing.data[0]["id"], "action": "updated"})
        else:
            res = supabase.table("contacts").insert(payload).execute()
            upserted.append({**payload, "id": res.data[0]["id"] if res.data else None, "action": "created"})

    return {
        "found": len(people),
        "upserted": len(upserted),
        "sources": sources_tried,
        "contacts": upserted,
    }