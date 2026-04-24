import logging
import requests
from .config import settings

logger = logging.getLogger(__name__)

APOLLO_BASE = "https://api.apollo.io/api/v1"

HEALTHCARE_TITLES = [
    "Administrator",
    "Facility Administrator",
    "Executive Director",
    "Director of Nursing",
    "DON",
    "Director of Clinical Operations",
    "Chief Nursing Officer",
    "Nurse Manager",
    "Head of Nursing",
    "VP of Nursing",
    "Nursing Director",
    "Clinical Director",
]


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": settings.apollo_api_key,
    }


def search_contacts(company_name: str, location: str | None = None) -> list[dict]:
    """Search Apollo for healthcare decision-makers at the given company."""
    if not settings.apollo_api_key:
        raise ValueError("APOLLO_API_KEY not configured")

    payload: dict = {
        "q_organization_name": company_name,
        "person_titles": HEALTHCARE_TITLES,
        "page": 1,
        "per_page": 25,
    }

    # Narrow by location if available (city/state)
    if location:
        parts = [p.strip() for p in location.split(",")]
        if len(parts) >= 2:
            payload["person_locations"] = [location]

    resp = requests.post(
        f"{APOLLO_BASE}/mixed_people/search",
        headers=_headers(),
        json=payload,
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()

    people = data.get("people", [])
    results = []
    for p in people:
        org = (p.get("organization") or {})
        # Only include if org name roughly matches (Apollo can return people from other orgs)
        org_name = (org.get("name") or "").lower()
        if company_name.lower().split()[0] not in org_name and org_name not in company_name.lower():
            continue
        results.append({
            "name": p.get("name") or f"{p.get('first_name', '')} {p.get('last_name', '')}".strip(),
            "title": p.get("title") or "",
            "email": p.get("email"),
            "linkedin_url": p.get("linkedin_url"),
            "apollo_id": p.get("id"),
        })

    logger.info("Apollo search for '%s': %d people found, %d matched org", company_name, len(people), len(results))
    return results


def reveal_email(apollo_person_id: str) -> str | None:
    """Attempt to reveal a person's email via Apollo enrichment (costs credits)."""
    if not settings.apollo_api_key:
        return None
    try:
        resp = requests.post(
            f"{APOLLO_BASE}/people/match",
            headers=_headers(),
            json={"id": apollo_person_id, "reveal_personal_emails": False},
            timeout=15,
        )
        resp.raise_for_status()
        person = resp.json().get("person", {})
        return person.get("email")
    except Exception as e:
        logger.warning("Apollo reveal failed for %s: %s", apollo_person_id, e)
        return None
