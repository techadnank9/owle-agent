import json
from ..state import AgentState
from ...claude import call_claude
from ...supabase_client import write_audit_log, update_account

SCORE_ACCOUNT_TOOL = {
    "name": "score_account",
    "description": "Score a skilled nursing facility account against Owle AI's ICP",
    "input_schema": {
        "type": "object",
        "properties": {
            "icp_score": {
                "type": "number",
                "description": "ICP fit 0-100. 90-100=SNF 60+ beds. 60-89=SNF uncertain size. 30-59=marginal. 0-29=no fit."
            },
            "priority_score": {
                "type": "number",
                "description": "Outreach priority 0-100. Boost for large bed count, multi-facility, active pain signals."
            },
            "icp_rationale": {"type": "string"},
            "verified_facts": {"type": "object", "description": "Facts taken directly from the data. No inference."},
            "inferred_assumptions": {"type": "object", "description": "Inferences not in the data. Clearly labeled."},
            "recommendation": {
                "type": "string",
                "enum": ["pursue", "pause", "exclude"]
            }
        },
        "required": ["icp_score", "priority_score", "icp_rationale", "verified_facts", "inferred_assumptions", "recommendation"]
    }
}


def account_selector_node(state: AgentState) -> dict:
    account = state["account_data"]

    # Deterministic CMS signal extraction for scoring context
    cms_signals = []
    try:
        turnover = float(account.get("nursing_staff_turnover_pct") or 0)
        if turnover >= 50: cms_signals.append(f"CRITICAL nurse turnover {turnover}% (severe staffing crisis)")
        elif turnover >= 30: cms_signals.append(f"HIGH nurse turnover {turnover}%")
    except (ValueError, TypeError): pass
    try:
        rn = float(account.get("rn_turnover_pct") or 0)
        if rn >= 30: cms_signals.append(f"HIGH RN turnover {rn}%")
    except (ValueError, TypeError): pass
    try:
        stars = int(float(account.get("cms_overall_rating") or 5))
        if stars <= 2: cms_signals.append(f"LOW star rating {stars}/5 — facility is struggling")
        elif stars == 3: cms_signals.append(f"Below average star rating {stars}/5")
    except (ValueError, TypeError): pass
    try:
        penalties = int(float(account.get("cms_total_penalties") or 0))
        fines = float(account.get("cms_fines_total_usd") or 0)
        if penalties > 0: cms_signals.append(f"{penalties} CMS penalties, ${int(fines):,} in fines")
    except (ValueError, TypeError): pass
    try:
        beds = int(float(account.get("bed_count") or 0))
        if beds >= 100: cms_signals.append(f"Large facility: {beds} beds")
    except (ValueError, TypeError): pass

    cms_context = (
        "\n\nCMS pain signals detected:\n" + "\n".join(f"- {s}" for s in cms_signals)
    ) if cms_signals else ""

    prompt = f"""Score this account against Owle AI's ideal customer profile.

ICP: Skilled nursing facilities (SNFs) with 60+ patient beds. Owle AI sells operational AI tools that reduce documentation burden, improve care coordination, and reduce staffing overhead.

Account data:
{json.dumps(account, indent=2)}{cms_context}

Priority scoring rules — these are PAIN signals. Stack bonuses for priority_score:

NURSE TURNOVER (biggest signal — high turnover = urgent need for staffing tools):
- Nurse turnover ≥75%: +35
- Nurse turnover 50–74%: +25
- Nurse turnover 30–49%: +15

RN TURNOVER:
- RN turnover ≥50%: +20
- RN turnover 30–49%: +12

CMS STAR RATING (lower = more pain):
- 1 star: +30
- 2 stars: +20
- 3 stars: +10

CMS PENALTIES (enforcement = compliance crisis):
- 5+ penalties: +25
- 2–4 penalties: +15
- 1 penalty: +8

SIZE (secondary — bigger = more value):
- Beds ≥200: +10
- Beds ≥100: +5

Cap priority_score at 100.

ICP scoring rules:
- 90-100: confirmed SNF ≥60 beds
- 60-89: SNF, uncertain size or slightly under 60 beds
- 30-59: marginal fit (non-SNF, very small, or unclear)
- 0-29: clear mismatch

- verified_facts: only what is explicitly in the data above
- inferred_assumptions: what you are inferring — be honest about uncertainty
- recommendation: pursue=proceed, pause=uncertain hold, exclude=clear mismatch

Call score_account."""

    try:
        msg = call_claude(prompt, tools=[SCORE_ACCOUNT_TOOL])
        tool_use = next((b for b in msg.content if b.type == "tool_use"), None)
    except Exception as e:
        tool_use = None
        print(f"[account_selector] Claude API failed: {e}")

    if not tool_use:
        # Deterministic fallback when Claude is unavailable — mirrors the prompt scoring rules
        beds = int(float(account.get("bed_count") or 0))
        icp = 90 if beds >= 60 else (60 if beds > 0 else 40)
        try: turnover = float(account.get("nursing_staff_turnover_pct") or 0)
        except (ValueError, TypeError): turnover = 0
        try: rn = float(account.get("rn_turnover_pct") or 0)
        except (ValueError, TypeError): rn = 0
        try: stars = int(float(account.get("cms_overall_rating") or 5))
        except (ValueError, TypeError): stars = 5
        try: penalties = int(float(account.get("cms_total_penalties") or 0))
        except (ValueError, TypeError): penalties = 0
        nurse_pts = 35 if turnover >= 75 else 25 if turnover >= 50 else 15 if turnover >= 30 else 0
        rn_pts    = 20 if rn >= 50 else 12 if rn >= 30 else 0
        star_pts  = 30 if stars == 1 else 20 if stars == 2 else 10 if stars == 3 else 0
        pen_pts   = 25 if penalties >= 5 else 15 if penalties >= 2 else 8 if penalties >= 1 else 0
        size_pts  = 10 if beds >= 200 else 5 if beds >= 100 else 0
        priority = min(nurse_pts + rn_pts + star_pts + pen_pts + size_pts, 100)
        result = {
            "icp_score": float(icp),
            "priority_score": float(priority),
            "icp_rationale": "Scored deterministically from CMS signals (Claude API unavailable)",
            "verified_facts": {k: account.get(k) for k in ("bed_count", "cms_overall_rating", "nursing_staff_turnover_pct") if account.get(k)},
            "inferred_assumptions": {},
            "recommendation": "pursue" if icp >= 60 else "pause",
        }
    else:
        result = tool_use.input

    entry = {
        "node": "account_selector",
        "action": f"scored: icp={result['icp_score']}, priority={result['priority_score']}, rec={result['recommendation']}",
        "rationale": result["icp_rationale"],
        "verified_facts": result["verified_facts"],
        "inferred_assumptions": result["inferred_assumptions"],
    }

    write_audit_log(
        account_id=state["account_id"],
        agent_run_id=state["agent_run_id"],
        node="account_selector",
        action=entry["action"],
        rationale=result["icp_rationale"],
        verified_facts=result["verified_facts"],
        inferred_assumptions=result["inferred_assumptions"],
    )

    status_map = {"pursue": "in_outreach", "pause": "paused", "exclude": "excluded"}
    update_account(state["account_id"], {
        "icp_score": result["icp_score"],
        "priority_score": result["priority_score"],
        "status": status_map.get(result["recommendation"], "paused"),
    })

    return {
        "icp_score": result["icp_score"],
        "priority_score": result["priority_score"],
        "icp_rationale": result["icp_rationale"],
        "verified_facts": result["verified_facts"],
        "inferred_assumptions": result["inferred_assumptions"],
        "audit_entries": state.get("audit_entries", []) + [entry],
    }
