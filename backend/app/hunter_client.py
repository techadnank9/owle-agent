import logging
import requests
from .config import settings

logger = logging.getLogger(__name__)

HUNTER_BASE = "https://api.hunter.io/v2"

RELEVANT_TITLES = {
    "administrator", "facility administrator", "executive director",
    "director of nursing", "don", "director of clinical operations",
    "chief nursing officer", "nurse manager", "head of nursing",
    "vp of nursing", "nursing director", "clinical director",
    "director of operations", "regional director", "ceo", "coo",
}


def _title_relevant(title: str) -> bool:
    if not title:
        return True  # include unknown titles rather than drop
    return any(t in title.lower() for t in RELEVANT_TITLES)


def search_contacts(company_name: str) -> list[dict]:
    """Search Hunter.io for contacts at the given company by name."""
    if not settings.hunter_api_key:
        raise ValueError("HUNTER_API_KEY not configured")

    resp = requests.get(
        f"{HUNTER_BASE}/domain-search",
        params={
            "company": company_name,
            "api_key": settings.hunter_api_key,
            "limit": 20,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json().get("data", {})

    results = []
    for e in data.get("emails", []):
        first = e.get("first_name") or ""
        last = e.get("last_name") or ""
        name = f"{first} {last}".strip() or e.get("value", "").split("@")[0]
        title = e.get("position") or ""
        if not _title_relevant(title):
            continue
        results.append({
            "name": name,
            "title": title,
            "email": e.get("value"),
            "linkedin_url": e.get("linkedin") or None,
            "source": "hunter",
        })

    logger.info("Hunter search for '%s': %d contacts found", company_name, len(results))
    return results
