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
