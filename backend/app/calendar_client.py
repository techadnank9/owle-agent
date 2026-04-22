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


def create_meeting_event(
    summary: str,
    proposed_time_str: str,
    attendee_email: str | None = None,
    duration_minutes: int = 30,
) -> dict:
    """Create a Google Calendar event with Meet conferencing. Returns meet_link and event_link."""
    service = build_calendar_service()

    start_dt = _parse_proposed_time(proposed_time_str)
    end_dt = start_dt + timedelta(minutes=duration_minutes)

    event_body = {
        "summary": summary,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "America/New_York"},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": "America/New_York"},
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


def _parse_proposed_time(text: str) -> datetime:
    """Parse '4 PM', '4 PM Today', '3:30 PM Tomorrow' into a datetime."""
    today = datetime.now().date()

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
