import json
import logging
import re
from datetime import datetime, timedelta, time as dtime

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .config import settings

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
]


def build_calendar_service():
    token_data = json.loads(settings.gmail_token)
    creds = Credentials.from_authorized_user_info(token_data, SCOPES)
    return build("calendar", "v3", credentials=creds)


_STATE_TIMEZONES: dict[str, str] = {
    "alabama": "America/Chicago", "alaska": "America/Anchorage",
    "arizona": "America/Phoenix", "arkansas": "America/Chicago",
    "california": "America/Los_Angeles", "colorado": "America/Denver",
    "connecticut": "America/New_York", "delaware": "America/New_York",
    "florida": "America/New_York", "georgia": "America/New_York",
    "hawaii": "Pacific/Honolulu", "idaho": "America/Boise",
    "illinois": "America/Chicago", "indiana": "America/Indiana/Indianapolis",
    "iowa": "America/Chicago", "kansas": "America/Chicago",
    "kentucky": "America/Kentucky/Louisville", "louisiana": "America/Chicago",
    "maine": "America/New_York", "maryland": "America/New_York",
    "massachusetts": "America/New_York", "michigan": "America/Detroit",
    "minnesota": "America/Chicago", "mississippi": "America/Chicago",
    "missouri": "America/Chicago", "montana": "America/Denver",
    "nebraska": "America/Chicago", "nevada": "America/Los_Angeles",
    "new hampshire": "America/New_York", "new jersey": "America/New_York",
    "new mexico": "America/Denver", "new york": "America/New_York",
    "north carolina": "America/New_York", "north dakota": "America/Chicago",
    "ohio": "America/New_York", "oklahoma": "America/Chicago",
    "oregon": "America/Los_Angeles", "pennsylvania": "America/New_York",
    "rhode island": "America/New_York", "south carolina": "America/New_York",
    "south dakota": "America/Chicago", "tennessee": "America/Chicago",
    "texas": "America/Chicago", "utah": "America/Denver",
    "vermont": "America/New_York", "virginia": "America/New_York",
    "washington": "America/Los_Angeles", "west virginia": "America/New_York",
    "wisconsin": "America/Chicago", "wyoming": "America/Denver",
    "district of columbia": "America/New_York", "dc": "America/New_York",
    # abbreviations
    "ca": "America/Los_Angeles", "ny": "America/New_York", "tx": "America/Chicago",
    "fl": "America/New_York", "il": "America/Chicago", "pa": "America/New_York",
    "oh": "America/New_York", "ga": "America/New_York", "nc": "America/New_York",
    "mi": "America/Detroit", "nj": "America/New_York", "va": "America/New_York",
    "wa": "America/Los_Angeles", "az": "America/Phoenix", "ma": "America/New_York",
    "tn": "America/Chicago", "in": "America/Indiana/Indianapolis",
    "mo": "America/Chicago", "md": "America/New_York", "wi": "America/Chicago",
    "co": "America/Denver", "mn": "America/Chicago", "sc": "America/New_York",
    "al": "America/Chicago", "la": "America/Chicago", "ky": "America/Kentucky/Louisville",
    "or": "America/Los_Angeles", "ok": "America/Chicago", "ct": "America/New_York",
    "ut": "America/Denver", "ia": "America/Chicago", "nv": "America/Los_Angeles",
    "ar": "America/Chicago", "ms": "America/Chicago", "ks": "America/Chicago",
    "nm": "America/Denver", "ne": "America/Chicago", "id": "America/Boise",
    "hi": "Pacific/Honolulu", "ak": "America/Anchorage", "mt": "America/Denver",
    "nd": "America/Chicago", "sd": "America/Chicago", "wy": "America/Denver",
    "vt": "America/New_York", "nh": "America/New_York", "me": "America/New_York",
    "ri": "America/New_York", "de": "America/New_York", "wv": "America/New_York",
}


def _location_to_timezone(location: str | None) -> str:
    if not location:
        return "America/Los_Angeles"
    parts = [p.strip().lower() for p in location.split(",")]
    # try last part first (usually state), then each part
    for part in reversed(parts):
        tz = _STATE_TIMEZONES.get(part)
        if tz:
            return tz
    return "America/Los_Angeles"


def create_meeting_event(
    summary: str,
    proposed_time_str: str,
    attendee_email: str | None = None,
    duration_minutes: int = 30,
    location: str | None = None,
    timezone_override: str | None = None,
) -> dict:
    """Create a Google Calendar event with Meet conferencing. Returns meet_link and event_link."""
    service = build_calendar_service()

    tz = timezone_override or _location_to_timezone(location)
    start_dt = _parse_proposed_time(proposed_time_str)
    end_dt = start_dt + timedelta(minutes=duration_minutes)

    event_body = {
        "summary": summary,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": tz},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": tz},
        "conferenceData": {
            "createRequest": {"requestId": f"owle-{int(start_dt.timestamp())}"}
        },
    }
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]

    event = service.events().insert(
        calendarId="primary",
        body=event_body,
        conferenceDataVersion=1,
        sendUpdates="all" if attendee_email else "none",
    ).execute()

    entry_points = event.get("conferenceData", {}).get("entryPoints", [])
    meet_link = next((ep["uri"] for ep in entry_points if ep.get("entryPointType") == "video"), "")
    event_link = event.get("htmlLink", "")

    logger.info("Calendar event created: %s (meet: %s)", event["id"], meet_link)
    return {"meet_link": meet_link, "event_link": event_link, "event_id": event["id"]}


def update_meeting_event(
    event_id: str,
    summary: str,
    proposed_time_str: str,
    attendee_email: str | None = None,
    duration_minutes: int = 30,
    timezone_override: str | None = None,
    location: str | None = None,
) -> dict:
    """Update an existing Google Calendar event's time. Returns updated meet_link."""
    service = build_calendar_service()
    tz = timezone_override or _location_to_timezone(location)
    start_dt = _parse_proposed_time(proposed_time_str)
    end_dt = start_dt + timedelta(minutes=duration_minutes)

    patch_body = {
        "start": {"dateTime": start_dt.isoformat(), "timeZone": tz},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": tz},
    }
    if attendee_email:
        patch_body["attendees"] = [{"email": attendee_email}]

    event = service.events().patch(
        calendarId="primary",
        eventId=event_id,
        body=patch_body,
        conferenceDataVersion=1,
        sendUpdates="all" if attendee_email else "none",
    ).execute()

    entry_points = event.get("conferenceData", {}).get("entryPoints", [])
    meet_link = next((ep["uri"] for ep in entry_points if ep.get("entryPointType") == "video"), "")
    logger.info("Calendar event updated: %s", event_id)
    return {"meet_link": meet_link, "event_id": event_id}


def _parse_proposed_time(text: str) -> datetime:
    """Parse ISO datetime or human strings like '4 PM Tomorrow' into a datetime."""
    today = datetime.now().date()

    # ISO format: YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS
    iso_match = re.match(r'(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})', text)
    if iso_match:
        return datetime(
            int(iso_match.group(1)[:4]),
            int(iso_match.group(1)[5:7]),
            int(iso_match.group(1)[8:10]),
            int(iso_match.group(2)),
            int(iso_match.group(3)),
        )

    match = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)', text, re.IGNORECASE)
    if not match:
        return datetime.combine(today + timedelta(days=1), dtime(10, 0))

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    ampm = match.group(3).lower()
    if ampm == "pm" and hour != 12:
        hour += 12
    elif ampm == "am" and hour == 12:
        hour = 0

    day = today
    if "tomorrow" in text.lower():
        day = today + timedelta(days=1)

    return datetime.combine(day, dtime(hour, minute))
