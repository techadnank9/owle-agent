import anthropic
from .config import settings

_client: anthropic.Anthropic | None = None

SYSTEM_PROMPT = """You are a revenue agent for Owle AI, which sells operational AI tools \
to skilled nursing facilities (SNFs) with 60+ patient beds.

Your job: identify high-fit accounts, map stakeholders, craft personalized outreach, \
and convert interest into booked pilot meetings.

Rules:
- Always distinguish verified facts (from provided data) from inferred assumptions (your reasoning).
- Never hallucinate contacts, titles, email addresses, or company facts.
- When uncertain, flag it explicitly and recommend human review.
- Be concise, credible, and specific — not generic."""


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def call_claude(
    user_prompt: str,
    tools: list | None = None,
    max_tokens: int = 2048,
) -> anthropic.types.Message:
    kwargs: dict = {
        "model": "claude-sonnet-4-6",
        "max_tokens": max_tokens,
        "system": [
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        "messages": [{"role": "user", "content": user_prompt}],
    }
    if tools:
        kwargs["tools"] = tools
    return get_client().messages.create(**kwargs)
