# Owle AI Revenue Agent — Plan 3: Gmail Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send approved outreach emails via Gmail API and link the sent thread ID back to the outreach_action so replies can be matched.

**Architecture:** `app/gmail.py` wraps the Gmail API (google-auth + googleapiclient). OAuth credentials stored as env vars (not in files). POST `/outreach/{id}/send` triggers the send and updates `outreach_actions.gmail_thread_id` and `status=sent`. A Gmail push subscription delivers incoming replies to `/webhooks/gmail` (already wired in Plan 2).

**Tech Stack:** google-auth, google-auth-oauthlib, google-api-python-client, FastAPI, Supabase

---

## Prerequisites (manual — do before running tasks)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable Gmail API
3. Create OAuth 2.0 credentials (Desktop app type)
4. Download `credentials.json`
5. Run this once locally to generate `token.json`:
   ```bash
   cd backend
   python -c "
   from google_auth_oauthlib.flow import InstalledAppFlow
   flow = InstalledAppFlow.from_client_secrets_file('credentials.json', ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'])
   creds = flow.run_local_server(port=0)
   print('GMAIL_TOKEN=' + creds.to_json())
   "
   ```
6. Copy the printed JSON value into `.env` as `GMAIL_TOKEN=<value>`
7. Add `GMAIL_SENDER_EMAIL=your@gmail.com` to `.env`

---

## File Map

```
backend/
├── app/
│   ├── gmail.py                    # NEW — Gmail API send + thread tracking
│   ├── config.py                   # MODIFY — add GMAIL_TOKEN, GMAIL_SENDER_EMAIL
│   └── routers/
│       └── outreach.py             # MODIFY — add POST /{id}/send endpoint
└── tests/
    └── test_gmail.py               # NEW
```

---

## Task 1: Update config + Gmail client

**Files:**
- Modify: `backend/app/config.py`
- Create: `backend/app/gmail.py`
- Create: `backend/tests/test_gmail.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_gmail.py`:

```python
import pytest
from unittest.mock import patch, MagicMock


def test_send_email_returns_thread_id():
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value.send.return_value.execute.return_value = {
        "id": "msg-123",
        "threadId": "thread-456",
    }

    with patch("app.gmail.build_service", return_value=mock_service):
        from app.gmail import send_email
        thread_id = send_email(
            to="recipient@facility.com",
            subject="Quick question about ops",
            body="Hi,\n\nWe help SNF operators...",
        )
        assert thread_id == "thread-456"


def test_send_email_raises_on_api_error():
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value.send.return_value.execute.side_effect = Exception("API error")

    with patch("app.gmail.build_service", return_value=mock_service):
        from app.gmail import send_email
        with pytest.raises(Exception, match="API error"):
            send_email(to="x@y.com", subject="test", body="test")
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_gmail.py -v
```

Expected: FAIL — `app.gmail` not found.

- [ ] **Step 3: Update `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    supabase_url: str
    supabase_key: str
    database_url: str
    langsmith_api_key: str = ""
    langchain_tracing_v2: bool = False
    gmail_token: str = ""
    gmail_sender_email: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
```

- [ ] **Step 4: Create `backend/app/gmail.py`**

```python
import base64
import json
from email.mime.text import MIMEText

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .config import settings

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
]


def build_service():
    token_data = json.loads(settings.gmail_token)
    creds = Credentials.from_authorized_user_info(token_data, SCOPES)
    return build("gmail", "v1", credentials=creds)


def send_email(to: str, subject: str, body: str) -> str:
    """Send email and return the Gmail thread ID."""
    service = build_service()

    message = MIMEText(body)
    message["to"] = to
    message["from"] = settings.gmail_sender_email
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    result = service.users().messages().send(
        userId="me",
        body={"raw": raw},
    ).execute()

    return result["threadId"]
```

- [ ] **Step 5: Run tests**

```bash
cd backend
pytest tests/test_gmail.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/gmail.py app/config.py tests/test_gmail.py
git commit -m "feat: Gmail client — send email, return thread ID"
```

---

## Task 2: Add send endpoint to outreach router

**Files:**
- Modify: `backend/app/routers/outreach.py`

- [ ] **Step 1: Add send endpoint to `backend/app/routers/outreach.py`**

Add this after the `reject_outreach` endpoint:

```python
@router.post("/{outreach_id}/send")
def send_outreach(outreach_id: str):
    supabase = get_supabase()

    result = (
        supabase.table("outreach_actions")
        .select("*, contacts(email, name)")
        .eq("id", outreach_id)
        .eq("status", "approved")
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Approved outreach action not found")

    action = result.data[0]
    contact = action.get("contacts") or {}
    to_email = contact.get("email")

    if not to_email:
        raise HTTPException(status_code=422, detail="No verified email for this contact — send manually")

    from ..gmail import send_email
    thread_id = send_email(
        to=to_email,
        subject=action["subject"] or "",
        body=action["body"] or "",
    )

    supabase.table("outreach_actions").update({
        "status": "sent",
        "gmail_thread_id": thread_id,
        "sent_at": "now()",
    }).eq("id", outreach_id).execute()

    return {"status": "sent", "outreach_id": outreach_id, "gmail_thread_id": thread_id}
```

Also add the import at the top of the file (after existing imports):

```python
from fastapi import APIRouter, HTTPException
from ..supabase_client import get_supabase
```

(These already exist — just confirm they're there.)

- [ ] **Step 2: Run full test suite**

```bash
cd backend
pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 3: Commit + push**

```bash
git add app/routers/outreach.py
git commit -m "feat: outreach send endpoint — Gmail API + thread ID tracking"
git push origin main
```

---

## Task 3: Update .env.example

- [ ] **Step 1: Update `backend/.env.example`**

```
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
LANGSMITH_API_KEY=
LANGCHAIN_TRACING_V2=false
GMAIL_TOKEN={"token":"...","refresh_token":"...","token_uri":"...","client_id":"...","client_secret":"...","scopes":["..."]}
GMAIL_SENDER_EMAIL=your@gmail.com
```

- [ ] **Step 2: Commit + push**

```bash
git add backend/.env.example
git commit -m "docs: add Gmail env vars to .env.example"
git push origin main
```
