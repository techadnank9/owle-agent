from supabase import create_client, Client
from .config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


def write_audit_log(
    account_id: str,
    agent_run_id: str,
    node: str,
    action: str,
    rationale: str,
    verified_facts: dict,
    inferred_assumptions: dict,
) -> None:
    get_supabase().table("audit_log").insert({
        "account_id": account_id,
        "agent_run_id": agent_run_id,
        "node": node,
        "action": action,
        "rationale": rationale,
        "verified_facts": verified_facts,
        "inferred_assumptions": inferred_assumptions,
    }).execute()


def update_account(account_id: str, updates: dict) -> None:
    get_supabase().table("accounts").update(updates).eq("id", account_id).execute()


def upsert_contacts(contacts: list[dict]) -> None:
    if not contacts:
        return
    for contact in contacts:
        try:
            get_supabase().table("contacts").insert(contact).execute()
        except Exception:
            # If contact already exists, update it
            try:
                get_supabase().table("contacts").update(contact).eq(
                    "account_id", contact["account_id"]
                ).eq("email", contact.get("email", "")).execute()
            except Exception:
                pass


def create_outreach_action(data: dict) -> dict:
    result = get_supabase().table("outreach_actions").insert(data).execute()
    return result.data[0]


def write_outcome_signal(data: dict) -> None:
    get_supabase().table("outcome_signals").insert(data).execute()


def get_outcome_summary() -> dict:
    """Aggregate outcome_signals into reply/meeting rates by angle and channel."""
    rows = get_supabase().table("outcome_signals").select(
        "message_angle, channel, reply_received, meeting_booked"
    ).execute().data or []

    angles: dict[str, dict] = {}
    channels: dict[str, dict] = {}

    for r in rows:
        angle = r.get("message_angle") or "unknown"
        ch = r.get("channel") or "unknown"

        angles.setdefault(angle, {"total": 0, "replies": 0, "meetings": 0})
        angles[angle]["total"] += 1
        if r.get("reply_received"):
            angles[angle]["replies"] += 1
        if r.get("meeting_booked"):
            angles[angle]["meetings"] += 1

        channels.setdefault(ch, {"total": 0, "replies": 0, "meetings": 0})
        channels[ch]["total"] += 1
        if r.get("reply_received"):
            channels[ch]["replies"] += 1
        if r.get("meeting_booked"):
            channels[ch]["meetings"] += 1

    def rate(n: int, d: int) -> float:
        return round(n / d, 2) if d else 0.0

    angle_stats = sorted([
        {
            "angle": a,
            "total": v["total"],
            "reply_rate": rate(v["replies"], v["total"]),
            "meeting_rate": rate(v["meetings"], v["total"]),
        }
        for a, v in angles.items() if a != "unknown"
    ], key=lambda x: x["reply_rate"], reverse=True)

    channel_stats = sorted([
        {
            "channel": c,
            "total": v["total"],
            "reply_rate": rate(v["replies"], v["total"]),
            "meeting_rate": rate(v["meetings"], v["total"]),
        }
        for c, v in channels.items() if c != "unknown"
    ], key=lambda x: x["reply_rate"], reverse=True)

    return {"angles": angle_stats, "channels": channel_stats, "total_signals": len(rows)}
