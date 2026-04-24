import logging
import re
import time
import requests
from .config import settings

logger = logging.getLogger(__name__)

APIFY_BASE = "https://api.apify.com/v2"
EMAIL_FINDER_ACTOR = "UjYaVP860Q2WaW4Kg"  # easy-email-finder (free)


def _token() -> str:
    return settings.apify_api_key


def _find_domain_via_tavily(company_name: str) -> str | None:
    """Use Tavily to find the company's website domain."""
    if not settings.tavily_api_key:
        return None
    try:
        resp = requests.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": f"{company_name} nursing home official website",
                "max_results": 3,
                "search_depth": "basic",
            },
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        for r in results:
            url = r.get("url", "")
            # Skip directories and aggregators
            skip = ["medicare.gov", "yelp.com", "healthgrades", "medicare", "caring.com",
                    "senioradvisor", "aplaceformom", "usnews", "facebook", "linkedin"]
            if any(s in url.lower() for s in skip):
                continue
            m = re.search(r"https?://(?:www\.)?([^/]+)", url)
            if m:
                return m.group(1).lower()
    except Exception as e:
        logger.warning("Tavily domain lookup failed for %s: %s", company_name, e)
    return None


def _run_actor_sync(actor_id: str, input_data: dict, timeout: int = 60) -> list[dict]:
    """Run an Apify actor and wait for results."""
    token = _token()

    # Start run
    resp = requests.post(
        f"{APIFY_BASE}/acts/{actor_id}/runs",
        params={"token": token},
        json=input_data,
        timeout=15,
    )
    resp.raise_for_status()
    run = resp.json().get("data", {})
    run_id = run["id"]
    dataset_id = run["defaultDatasetId"]

    # Poll until done
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(4)
        status_resp = requests.get(
            f"{APIFY_BASE}/actor-runs/{run_id}",
            params={"token": token},
            timeout=10,
        )
        status = status_resp.json().get("data", {}).get("status", "")
        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break

    # Fetch dataset
    items_resp = requests.get(
        f"{APIFY_BASE}/datasets/{dataset_id}/items",
        params={"token": token},
        timeout=10,
    )
    items_resp.raise_for_status()
    data = items_resp.json()
    return data if isinstance(data, list) else []


def find_emails_by_domain(domain: str) -> list[str]:
    """Run easy-email-finder actor for a domain. Returns list of email strings."""
    if not _token():
        return []
    try:
        items = _run_actor_sync(EMAIL_FINDER_ACTOR, {"domain": domain, "maxEmails": 30})
        emails = []
        for item in items:
            # Actor returns {"Domain": "...", "Emails": [...]}
            raw = item.get("Emails") or item.get("emails") or []
            for e in raw:
                e = e.strip().lower()
                # Filter junk: must look like real email, skip no-reply/test/copy etc
                if (
                    "@" in e
                    and not any(x in e for x in ["no-reply", "noreply", "test@", "example", "u003", "your.email", "my.email"])
                    and len(e) < 80
                ):
                    emails.append(e)
        return list(dict.fromkeys(emails))  # dedupe preserving order
    except Exception as e:
        logger.warning("Apify email finder failed for %s: %s", domain, e)
        return []


def search_contacts(company_name: str, location: str | None = None) -> list[dict]:
    """Find emails for a company using Apify free actor. Returns contact dicts."""
    if not _token():
        raise ValueError("APIFY_API_KEY not configured")

    domain = _find_domain_via_tavily(company_name)
    if not domain:
        logger.info("No domain found for '%s', skipping Apify email search", company_name)
        return []

    logger.info("Apify email search for '%s' via domain '%s'", company_name, domain)
    emails = find_emails_by_domain(domain)

    # Build contact-style dicts — no names/titles from this source
    results = []
    for email in emails:
        local = email.split("@")[0]
        # Skip generic mailboxes
        if local in {"info", "contact", "hello", "support", "admin", "office", "mail", "reception", "hr", "billing"}:
            continue
        results.append({
            "name": local.replace(".", " ").replace("-", " ").title(),
            "title": "",
            "email": email,
            "linkedin_url": None,
            "source": "apify",
        })

    return results
