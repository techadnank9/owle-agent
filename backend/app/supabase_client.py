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
