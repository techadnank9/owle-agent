import logging
from agentmail import AgentMail
from .config import settings

logger = logging.getLogger(__name__)

INBOX_ID = "owle@agentmail.to"


def get_client() -> AgentMail:
    return AgentMail(api_key=settings.agentmail_api_key)


def reply_in_thread(thread_id: str, body: str) -> str:
    """Reply to the last message in an AgentMail thread. Returns new message_id."""
    client = get_client()
    thread = client.inboxes.threads.get(INBOX_ID, thread_id)
    last_message_id = thread.last_message_id
    msg = client.inboxes.messages.reply(INBOX_ID, last_message_id, text=body)
    return msg.message_id


def send_email(to: str, subject: str, body: str) -> tuple[str, str]:
    """Send email via AgentMail. Returns (message_id, thread_id)."""
    client = get_client()
    message = client.inboxes.messages.send(
        INBOX_ID,
        to=[to],
        subject=subject,
        text=body,
    )
    return message.message_id, message.thread_id


def ensure_webhook(backend_url: str) -> None:
    """Register AgentMail webhook idempotently. No-op if backend_url is empty."""
    if not backend_url:
        logger.warning("BACKEND_URL not set — skipping AgentMail webhook registration")
        return
    client = get_client()
    client.webhooks.create(
        url=f"{backend_url}/webhooks/agentmail",
        event_types=["message.received"],
        client_id="owle-reply-webhook",
    )
    logger.info("AgentMail webhook registered: %s/webhooks/agentmail", backend_url)
