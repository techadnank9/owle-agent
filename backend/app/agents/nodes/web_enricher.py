"""
Web enricher node — runs before account_selector.

Step 1 (always): CMS Provider Data API lookup — free, no key needed.
  Returns bed count, CMS rating, staffing rating, ownership type, payer mix.
Step 2 (fallback): Tavily web search — only if CMS lookup fails and TAVILY_API_KEY set.
"""
import json
from ..state import AgentState
from ...config import settings
from ...supabase_client import write_audit_log, update_account

CMS_API = "https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0"


def _needs_bed_count(account_data: dict) -> bool:
    return not bool(account_data.get("bed_count") or account_data.get("beds"))


def _needs_enrichment(account_data: dict) -> bool:
    has_bed_count = bool(account_data.get("bed_count") or account_data.get("beds"))
    has_location = bool(account_data.get("location") or account_data.get("city"))
    return not (has_bed_count and has_location)


def _cms_lookup(name: str, state: str | None, city: str | None) -> dict | None:
    """Query CMS Provider Data API. Returns best matching record or None."""
    try:
        import httpx
        search_name = (
            name.upper()
            .replace(" INC.", "").replace(" LLC", "").replace(", INC", "")
            .replace(" AND ", " ").strip()
        )
        params: dict = {"limit": 5, "offset": 0, "keywords": search_name}
        # CMS API filter syntax: conditions[N][property/value/operator]
        cond_index = 0
        if state:
            params[f"conditions[{cond_index}][property]"] = "state"
            params[f"conditions[{cond_index}][value]"] = state.upper()
            params[f"conditions[{cond_index}][operator]"] = "="
            cond_index += 1
        if city:
            params[f"conditions[{cond_index}][property]"] = "citytown"
            params[f"conditions[{cond_index}][value]"] = city.upper()
            params[f"conditions[{cond_index}][operator]"] = "="

        r = httpx.get(CMS_API, params=params, timeout=10,
                      headers={"User-Agent": "owle-agent/1.0"})
        data = r.json()

        results = data.get("results", data.get("data", []))
        if not results:
            return None

        def score(rec: dict) -> int:
            prov = (rec.get("provider_name") or "").upper()
            rec_state = (rec.get("state") or "").upper()
            name_score = 2 if search_name in prov or prov in search_name else 0
            state_score = 1 if state and rec_state == state.upper() else 0
            return name_score + state_score

        best = sorted(results, key=score, reverse=True)[0]
        best_score = score(best)

        # Reject low-confidence matches — must have at least partial name overlap
        if best_score == 0:
            return None

        # Reject if state doesn't match at all (wrong state = wrong facility)
        if state:
            rec_state = (best.get("state") or "").upper()
            if rec_state != state.upper():
                return None

        return best
    except Exception:
        return None


def _parse_cms_record(record: dict) -> dict:
    """Extract relevant fields from a CMS record using actual API field names."""
    enriched: dict = {"cms_matched": True}

    bed_count = record.get("number_of_certified_beds")
    if bed_count:
        try:
            enriched["bed_count"] = int(float(bed_count))
        except (ValueError, TypeError):
            pass

    avg_residents = record.get("average_number_of_residents_per_day")
    if avg_residents:
        enriched["avg_residents_per_day"] = str(avg_residents)

    for field, label in [
        # Quality ratings
        ("overall_rating", "cms_overall_rating"),
        ("staffing_rating", "cms_staffing_rating"),
        ("health_inspection_rating", "cms_health_inspection_rating"),
        ("qm_rating", "cms_quality_measure_rating"),
        # Ownership & type
        ("ownership_type", "ownership_type"),
        ("provider_type", "provider_type"),
        ("continuing_care_retirement_community", "is_ccrc"),
        # Staffing signals
        ("total_nursing_staff_turnover", "nursing_staff_turnover_pct"),
        ("registered_nurse_turnover", "rn_turnover_pct"),
        ("reported_rn_staffing_hours_per_resident_per_day", "rn_hours_per_resident"),
        ("reported_total_nurse_staffing_hours_per_resident_per_day", "total_nurse_hours_per_resident"),
        ("number_of_administrators_who_have_left_the_nursing_home", "admin_turnover_count"),
        # Pain signals — compliance & fines
        ("number_of_fines", "cms_fines_count"),
        ("total_amount_of_fines_in_dollars", "cms_fines_total_usd"),
        ("total_number_of_penalties", "cms_total_penalties"),
        ("total_weighted_health_survey_score", "cms_health_survey_score"),
        ("abuse_icon", "cms_abuse_flag"),
        ("most_recent_health_inspection_more_than_2_years_ago", "cms_inspection_overdue"),
    ]:
        val = record.get(field)
        if val is not None and val != "":
            enriched[label] = str(val)

    city = record.get("citytown", "")
    state = record.get("state", "")
    if city and state:
        enriched["location"] = f"{city.title()}, {state.upper()}"

    provname = record.get("provider_name")
    if provname:
        enriched["cms_provider_name"] = provname.title()

    phone = record.get("telephone_number")
    if phone and not enriched.get("phone"):
        enriched["cms_phone"] = str(phone)

    return enriched


SKIP_DOMAINS = {"medicare.gov", "cms.gov", "google.com", "yelp.com", "facebook.com", "healthgrades.com"}


def _fetch_website_contacts(website_url: str) -> dict:
    """Scrape contact email/phone from facility website using Apify website-content-crawler."""
    if not settings.apify_api_key or not website_url:
        return {}
    # Skip non-facility URLs (government directories, review sites)
    from urllib.parse import urlparse
    try:
        domain = urlparse(website_url).netloc.lower().replace("www.", "")
        if any(skip in domain for skip in SKIP_DOMAINS):
            return {}
    except Exception:
        pass
    try:
        from apify_client import ApifyClient
        import re
        client = ApifyClient(settings.apify_api_key)
        # Use website-content-crawler to get text, then extract emails with regex
        run = client.actor("apify~website-content-crawler").call(
            run_input={
                "startUrls": [{"url": website_url}],
                "maxCrawlPages": 5,
                "maxCrawlDepth": 1,
                "crawlerType": "playwright:firefox",
                "dynamicContentWaitSecs": 3,
                "proxyConfiguration": {"useApifyProxy": True},
            },
            timeout_secs=180,
        )
        result: dict = {}
        emails_found: set = set()
        phones_found: set = set()
        linkedin_company_urls: set = set()
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            text = item.get("text", "") or item.get("markdown", "") or ""
            # Extract emails
            for email in re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text):
                if not any(skip in email.lower() for skip in ["example", "placeholder", "noreply", "no-reply"]):
                    emails_found.add(email.lower())
            # Extract phone numbers
            for phone in re.findall(r"\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}", text):
                phones_found.add(phone)
            # Extract LinkedIn company URLs from text/links
            for li_url in re.findall(r"https?://(?:www\.)?linkedin\.com/company/[a-zA-Z0-9\-_/]+", text):
                linkedin_company_urls.add(li_url.rstrip("/"))
            # Also check metadata/links field if present
            for link in item.get("links", []):
                href = link.get("href", "") if isinstance(link, dict) else str(link)
                if "linkedin.com/company/" in href:
                    linkedin_company_urls.add(href.split("?")[0].rstrip("/"))
        if emails_found:
            result["contact_email"] = sorted(emails_found)[0]
            result["all_emails"] = sorted(emails_found)[:5]
        if phones_found:
            result["contact_phone"] = sorted(phones_found)[0]
        if linkedin_company_urls:
            result["linkedin_company_url"] = sorted(linkedin_company_urls)[0]
        return result
    except Exception:
        return {}


def _fetch_linkedin_profiles(facility_name: str, location: str, company_linkedin_url: str = "") -> tuple[list[dict], str]:
    """Find decision-maker LinkedIn profiles.
    If company_linkedin_url is provided (from website crawl), use it directly.
    Otherwise search via harvestapi. Returns (profiles, company_linkedin_url)."""
    if not settings.apify_api_key:
        return [], ""
    try:
        from apify_client import ApifyClient
        client = ApifyClient(settings.apify_api_key)

        profiles = []
        company_url = company_linkedin_url or ""
        linkedin_urls: list[str] = []

        # Step A: If we have the company LinkedIn URL, scrape employees directly
        if company_url:
            try:
                run_co = client.actor("curious_coder~linkedin-company-scraper").call(
                    run_input={
                        "startUrls": [{"url": f"{company_url}/people/"}],
                        "maxItems": 10,
                    },
                    timeout_secs=90,
                )
                for item in client.dataset(run_co["defaultDatasetId"]).iterate_items():
                    title_val = item.get("title", "") or item.get("headline", "")
                    # Only keep decision-makers
                    if any(t in title_val.lower() for t in ["administrator", "director", "don", "coo", "ceo", "vp", "president", "manager"]):
                        url = item.get("profileUrl") or item.get("linkedinUrl", "")
                        if url and "linkedin.com/in/" in url:
                            clean = url.split("?")[0]
                            if clean not in linkedin_urls:
                                linkedin_urls.append(clean)
            except Exception:
                pass

        # Step B: Search LinkedIn by company name — one broad search, filter locally by role
        DECISION_MAKER_TITLES = ["administrator", "director", "don", "coo", "ceo", "vp", "president", "manager", "executive"]
        if not linkedin_urls:
            try:
                run = client.actor("harvestapi~linkedin-profile-search").call(
                    run_input={
                        "searchQuery": facility_name,
                        "maxItems": 10,
                    },
                    timeout_secs=60,
                )
                for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                    # filter to decision-maker roles only
                    headline = (item.get("headline") or "").lower()
                    cur_pos = item.get("currentPosition") or []
                    pos_title = (cur_pos[0].get("position", "") if cur_pos else "").lower()
                    if not any(t in headline or t in pos_title for t in DECISION_MAKER_TITLES):
                        continue
                    url = item.get("linkedinUrl") or item.get("profileUrl") or item.get("url", "")
                    if url and "linkedin.com/in/" in url:
                        clean = url.split("?")[0]
                        if clean not in linkedin_urls:
                            linkedin_urls.append(clean)
                    if not company_url:
                        co_pos = item.get("currentPosition") or []
                        company_url = (co_pos[0].get("companyLinkedinUrl", "") if co_pos else "") or item.get("companyLinkedinUrl", "")
            except Exception:
                pass

        # Primary: harvestapi/linkedin-profile-scraper (free plan compatible, 4.71★, 16k users)
        if linkedin_urls:
            enriched = False
            try:
                run2 = client.actor("harvestapi~linkedin-profile-scraper").call(
                    run_input={
                        "queries": linkedin_urls[:4],
                        "profileScraperMode": "Profile details + email search ($10 per 1k)",
                    },
                    timeout_secs=120,
                )
                for item in client.dataset(run2["defaultDatasetId"]).iterate_items():
                    # harvestapi returns firstName/lastName separately
                    first = item.get("firstName", "") or ""
                    last = item.get("lastName", "") or ""
                    full_name = f"{first} {last}".strip() or item.get("name", "")
                    headline = item.get("headline", "") or ""
                    # job_title: currentPosition[0].position is most accurate
                    # jobTitle/title not present at root in profile-search output
                    cur_pos = item.get("currentPosition") or []
                    job_title = (
                        item.get("jobTitle", "")
                        or item.get("title", "")
                        or (cur_pos[0].get("position", "") if cur_pos else "")
                        or headline
                    )
                    # company: root companyName or currentPosition[0].companyName
                    company = item.get("companyName", "") or item.get("company", "")
                    if not company and cur_pos:
                        company = cur_pos[0].get("companyName", "")
                    # email: scalar or first element of emails[]
                    emails_list = item.get("emails") or []
                    email = item.get("email", "") or (emails_list[0] if emails_list else "")
                    # location: may be dict {linkedinText, countryCode, parsed}
                    loc_raw = item.get("location", "") or item.get("geoLocationName", "")
                    if isinstance(loc_raw, dict):
                        loc_str = loc_raw.get("parsed", {}).get("text", "") or loc_raw.get("linkedinText", "")
                    else:
                        loc_str = str(loc_raw) if loc_raw else ""
                    profiles.append({
                        "full_name": full_name or headline or "Unknown",
                        "headline": headline,
                        "job_title": job_title,
                        "company": company,
                        "email": email,
                        "linkedin_url": item.get("linkedinUrl", "") or item.get("profileUrl", ""),
                        "location": loc_str,
                    })
                enriched = True
            except Exception:
                pass

            # Backup: dev_fusion/Linkedin-Profile-Scraper (paid plan only, 4.35★, 51k users)
            if not enriched:
                try:
                    run2 = client.actor("2SyF0bVxmgGr8IVCZ").call(
                        run_input={"profileUrls": linkedin_urls[:4]},
                        timeout_secs=120,
                    )
                    for item in client.dataset(run2["defaultDatasetId"]).iterate_items():
                        if item.get("succeeded") is not False:
                            _hn = item.get("headline", "")
                            profiles.append({
                                "full_name": item.get("fullName", "") or _hn or "Unknown",
                                "headline": _hn,
                                "job_title": item.get("jobTitle", ""),
                                "company": item.get("companyName", ""),
                                "email": item.get("email", ""),
                                "linkedin_url": item.get("linkedinUrl", ""),
                                "location": item.get("geoLocationName", ""),
                            })
                    enriched = True
                except Exception:
                    pass

            # Final fallback: store just URLs without email enrichment
            if not enriched:
                for url in linkedin_urls[:4]:
                    profiles.append({
                        "full_name": "", "headline": "", "job_title": "",
                        "company": facility_name, "email": "",
                        "linkedin_url": url, "location": location,
                    })

        return profiles, company_url
    except Exception:
        return [], ""
def _search_facility(query: str) -> list[dict]:
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=settings.tavily_api_key)
        response = client.search(query=query, search_depth="basic", max_results=5, include_answer=True)
        return response.get("results", [])
    except Exception:
        return []


def web_enricher_node(state: AgentState) -> dict:
    account_data = dict(state["account_data"])
    name = account_data.get("name", "")
    location = account_data.get("location", "")
    city = account_data.get("city") or (location.split(",")[0].strip() if "," in location else None)
    raw_state = account_data.get("state") or (location.split(",")[-1].strip() if "," in location else None)
    # Normalize state — extract 2-letter abbreviation if present (e.g. "California" → None, "CA" → "CA")
    state_abbr = raw_state.strip()[:2].upper() if raw_state and len(raw_state.strip()) >= 2 else None

    cms_enriched: dict = {}
    cms_record = _cms_lookup(name, state_abbr, city)
    if cms_record:
        cms_enriched = _parse_cms_record(cms_record)
        account_data.update(cms_enriched)

        db_update: dict = {}
        if cms_enriched.get("bed_count"):
            db_update["bed_count"] = cms_enriched["bed_count"]
        if cms_enriched.get("location") and not account_data.get("location"):
            db_update["location"] = cms_enriched["location"]
        if db_update:
            update_account(state["account_id"], db_update)

        fines = cms_enriched.get("cms_fines_count", "0")
        fines_usd = cms_enriched.get("cms_fines_total_usd", "0")
        penalties = cms_enriched.get("cms_total_penalties", "0")
        abuse_flag = cms_enriched.get("cms_abuse_flag", "N")
        inspection_overdue = cms_enriched.get("cms_inspection_overdue", "N")
        nurse_turnover = cms_enriched.get("nursing_staff_turnover_pct", "unknown")
        rn_turnover = cms_enriched.get("rn_turnover_pct", "unknown")
        admin_turnover = cms_enriched.get("admin_turnover_count", "0")

        pain_signals = []
        if fines and fines != "0": pain_signals.append(f"{fines} CMS fines (${fines_usd})")
        if penalties and penalties != "0": pain_signals.append(f"{penalties} total penalties")
        if abuse_flag == "Y": pain_signals.append("abuse flag on record")
        if inspection_overdue == "Y": pain_signals.append("health inspection overdue >2 years")
        if nurse_turnover != "unknown" and float(nurse_turnover) > 50: pain_signals.append(f"high nurse turnover ({nurse_turnover}%)")
        if rn_turnover != "unknown" and float(rn_turnover) > 30: pain_signals.append(f"high RN turnover ({rn_turnover}%)")
        if admin_turnover and admin_turnover != "0": pain_signals.append(f"{admin_turnover} administrator(s) left")

        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="web_enricher",
            action=f"CMS matched — beds={cms_enriched.get('bed_count', 'unknown')}, "
                   f"rating={cms_enriched.get('cms_overall_rating', '?')}/5, "
                   f"staffing={cms_enriched.get('cms_staffing_rating', '?')}/5, "
                   f"ownership={cms_enriched.get('ownership_type', 'unknown')}",
            rationale=(
                f"Provider: {cms_enriched.get('cms_provider_name', name)}. "
                f"Avg residents/day: {cms_enriched.get('avg_residents_per_day', 'unknown')}. "
                f"Nurse turnover: {nurse_turnover}%, RN turnover: {rn_turnover}%. "
                f"Pain signals: {', '.join(pain_signals) if pain_signals else 'none detected'}."
            ),
            verified_facts={k: v for k, v in cms_enriched.items() if k != "cms_matched"},
            inferred_assumptions={},
        )
        # If we got bed_count from CMS, no need for Tavily
        if cms_enriched.get("bed_count"):
            pass  # continue to contact enrichment below

    # Step 2: Apify website contact scraper — runs always when website URL exists
    website = account_data.get("website", "")
    if website and settings.apify_api_key and not account_data.get("contact_email"):
        contact_info = _fetch_website_contacts(website)
        if contact_info:
            account_data.update(contact_info)
            write_audit_log(
                account_id=state["account_id"],
                agent_run_id=state["agent_run_id"],
                node="web_enricher",
                action=f"Website scraped — found: {', '.join(k for k in contact_info if contact_info[k])}",
                rationale=f"Scraped {website} for contact details.",
                verified_facts=contact_info,
                inferred_assumptions={},
            )

    # Step 3: LinkedIn decision-maker profiles + company page (no Tavily needed)
    loc = account_data.get("location", "")
    existing_company_url = account_data.get("linkedin_company_url", "")
    if settings.apify_api_key:
        linkedin_profiles, company_linkedin = _fetch_linkedin_profiles(name, loc, existing_company_url)
        if company_linkedin and not account_data.get("linkedin_company_url"):
            account_data["linkedin_company_url"] = company_linkedin
        if linkedin_profiles:
            account_data["linkedin_profiles"] = linkedin_profiles
            # Extract emails from profiles and store top one
            profile_emails = [p["email"] for p in linkedin_profiles if p.get("email")]
            if profile_emails and not account_data.get("contact_email"):
                account_data["contact_email"] = profile_emails[0]
            write_audit_log(
                account_id=state["account_id"],
                agent_run_id=state["agent_run_id"],
                node="web_enricher",
                action=f"LinkedIn profiles found — {len(linkedin_profiles)} decision-maker(s)"
                       + (f", company page found" if company_linkedin else "")
                       + (f", {len(profile_emails)} email(s) extracted" if profile_emails else ""),
                rationale=f"Searched LinkedIn for {name} staff in {loc}.",
                verified_facts={"profiles_count": len(linkedin_profiles),
                                "company_linkedin": company_linkedin,
                                "emails_found": profile_emails[:3]},
                inferred_assumptions={},
            )

    # Persist enrichment — strip large text blobs only, keep all structured fields
    SKIP_KEYS = {"text", "markdown", "html", "content", "body"}
    compact = {}
    for k, v in account_data.items():
        if k in SKIP_KEYS:
            continue
        # Skip only long strings — keep lists, dicts, numbers, booleans
        if isinstance(v, str) and len(v) > 500:
            continue
        compact[k] = v
    try:
        update_account(state["account_id"], {"raw_data": compact})
        print(f"[web_enricher] saved raw_data keys: {list(compact.keys())}")
    except Exception as e:
        print(f"[web_enricher] failed to save raw_data: {e}")

    if cms_enriched.get("bed_count"):
        return {"account_data": account_data}

    # Step 4: Tavily fallback if CMS didn't find bed count
    if not settings.tavily_api_key or not _needs_enrichment(account_data):
        if not cms_record:
            write_audit_log(
                account_id=state["account_id"],
                agent_run_id=state["agent_run_id"],
                node="web_enricher",
                action="CMS: no match. Tavily: skipped (not configured or data sufficient)",
                rationale="",
                verified_facts={},
                inferred_assumptions={},
            )
        return {"account_data": account_data}

    email = account_data.get("email", "")
    domain = email.split("@")[-1] if "@" in email else name
    query = f'"{domain}" OR "{name}" skilled nursing facility bed count location'
    results = _search_facility(query)

    if not results:
        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="web_enricher",
            action="CMS: no match. Tavily: searched — no results found",
            rationale=f"Query: {query}",
            verified_facts={},
            inferred_assumptions={},
        )
        return {"account_data": account_data}

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
                "facility_name": {"type": "string"},
                "bed_count": {"type": "integer"},
                "location": {"type": "string"},
                "facility_type": {"type": "string"},
                "parent_organization": {"type": "string"},
                "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                "notes": {"type": "string"},
            },
            "required": ["confidence", "notes"],
        },
    }

    prompt = f"""Extract structured facility information from these web search results.

Search query: {query}

Search results:
{snippets}

Only extract facts clearly stated in the results. Set confidence=low if uncertain.
Call extract_facility_info."""

    msg = call_claude(prompt, tools=[EXTRACT_TOOL])
    tool_use = next((b for b in msg.content if b.type == "tool_use"), None)

    tavily_enriched: dict = {}
    if tool_use:
        extracted = tool_use.input
        if extracted.get("facility_name"):
            tavily_enriched["name"] = extracted["facility_name"]
        if extracted.get("bed_count"):
            tavily_enriched["bed_count"] = extracted["bed_count"]
        if extracted.get("location"):
            tavily_enriched["location"] = extracted["location"]
        if extracted.get("facility_type"):
            tavily_enriched["type"] = extracted["facility_type"]
        if extracted.get("parent_organization"):
            tavily_enriched["parent_organization"] = extracted["parent_organization"]

        account_data.update(tavily_enriched)

        db_update2: dict = {}
        if tavily_enriched.get("bed_count"):
            db_update2["bed_count"] = tavily_enriched["bed_count"]
        if tavily_enriched.get("location"):
            db_update2["location"] = tavily_enriched["location"]
        if tavily_enriched.get("name"):
            db_update2["name"] = tavily_enriched["name"]
        if db_update2:
            update_account(state["account_id"], db_update2)

        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="web_enricher",
            action=f"Tavily enriched — found: {list(tavily_enriched.keys())} (confidence={extracted.get('confidence')})",
            rationale=extracted.get("notes", ""),
            verified_facts=tavily_enriched,
            inferred_assumptions={},
        )
    else:
        write_audit_log(
            account_id=state["account_id"],
            agent_run_id=state["agent_run_id"],
            node="web_enricher",
            action="Tavily searched — Claude returned no structured output",
            rationale=f"Query: {query}",
            verified_facts={},
            inferred_assumptions={},
        )

    return {"account_data": account_data}
