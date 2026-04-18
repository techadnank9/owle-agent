"""
Web enricher node — runs before account_selector.
Searches the web for facility details (name, bed count, location, type)
when the account_data is sparse (e.g. only an email was provided).
Skips enrichment if bed_count and location are already present.
"""
import json
from ..state import AgentState
from ...config import settings
from ...supabase_client import write_audit_log, update_account


def _needs_enrichment(account_data: dict) -> bool:
    has_bed_count = bool(account_data.get("bed_count") or account_data.get("beds"))
    has_location = bool(account_data.get("location") or account_data.get("city"))
    return not (has_bed_count and has_location)


def _search_facility(query: str) -> list[dict]:
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=settings.tavily_api_key)
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=5,
            include_answer=True,
        )
        return response.get("results", [])
    except Exception:
        return []


def web_enricher_node(state: AgentState) -> dict:
    account_data = dict(state["account_data"])

    if not settings.tavily_api_key or not _needs_enrichment(account_data):
        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="web_enricher",
            action="skipped — data already sufficient or Tavily not configured",
            rationale="",
            verified_facts={},
            inferred_assumptions={},
        )
        return {"account_data": account_data}

    email = account_data.get("email", "")
    name = account_data.get("name", "")
    domain = email.split("@")[-1] if "@" in email else name

    query = f'"{domain}" OR "{name}" skilled nursing facility bed count location'
    results = _search_facility(query)

    if not results:
        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="web_enricher",
            action="searched — no results found",
            rationale=f"Query: {query}",
            verified_facts={},
            inferred_assumptions={},
        )
        return {"account_data": account_data}

    # Ask Claude to extract structured facility data from search snippets
    from ...claude import call_claude

    snippets = "\n\n".join(
        f"[{r.get('title', '')}]\n{r.get('content', '')}" for r in results[:5]
    )

    EXTRACT_TOOL = {
        "name": "extract_facility_info",
        "description": "Extract structured facility information from web search results",
        "input_schema": {
            "type": "object",
            "properties": {
                "facility_name": {"type": "string", "description": "Official facility name if found"},
                "bed_count": {"type": "integer", "description": "Number of licensed beds if found"},
                "location": {"type": "string", "description": "City and state if found"},
                "facility_type": {"type": "string", "description": "e.g. skilled nursing facility, assisted living"},
                "parent_organization": {"type": "string", "description": "Parent company or health system if found"},
                "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                "notes": {"type": "string", "description": "Any caveats or uncertainty"},
            },
            "required": ["confidence", "notes"],
        },
    }

    prompt = f"""Extract structured facility information from these web search results.

Search query: {query}

Search results:
{snippets}

Only extract facts that are clearly stated in the results. Set confidence=low if uncertain.
Call extract_facility_info."""

    msg = call_claude(prompt, tools=[EXTRACT_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    enriched: dict = {}
    if tool_use:
        extracted = tool_use.input
        if extracted.get("facility_name"):
            enriched["name"] = extracted["facility_name"]
        if extracted.get("bed_count"):
            enriched["bed_count"] = extracted["bed_count"]
        if extracted.get("location"):
            enriched["location"] = extracted["location"]
        if extracted.get("facility_type"):
            enriched["type"] = extracted["facility_type"]
        if extracted.get("parent_organization"):
            enriched["parent_organization"] = extracted["parent_organization"]

        account_data.update(enriched)

        # Persist enriched fields back to the accounts table
        db_update: dict = {}
        if enriched.get("name"):
            db_update["name"] = enriched["name"]
        if enriched.get("bed_count"):
            db_update["bed_count"] = enriched["bed_count"]
        if enriched.get("location"):
            db_update["location"] = enriched["location"]
        if db_update:
            update_account(state["account_id"], db_update)

        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="web_enricher",
            action=f"enriched — found: {list(enriched.keys())} (confidence={extracted.get('confidence')})",
            rationale=extracted.get("notes", ""),
            verified_facts=enriched,
            inferred_assumptions={},
        )
    else:
        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="web_enricher",
            action="searched — Claude returned no structured output",
            rationale=f"Query: {query}",
            verified_facts={},
            inferred_assumptions={},
        )

    return {"account_data": account_data}
