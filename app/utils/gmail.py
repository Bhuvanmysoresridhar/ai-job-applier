import json
import base64
from typing import List, Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from loguru import logger
from app.config import settings

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]


def get_gmail_auth_url(user_id: int) -> str:
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GMAIL_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GMAIL_REDIRECT_URI
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=str(user_id),
        prompt="consent",
    )
    return auth_url


def exchange_code_for_token(code: str) -> dict:
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GMAIL_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GMAIL_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes),
    }


def get_gmail_service(token_dict: dict):
    creds = Credentials(
        token=token_dict.get("token"),
        refresh_token=token_dict.get("refresh_token"),
        token_uri=token_dict.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token_dict.get("client_id"),
        client_secret=token_dict.get("client_secret"),
        scopes=token_dict.get("scopes", SCOPES),
    )
    return build("gmail", "v1", credentials=creds)


def fetch_recent_emails(token_dict: dict, max_results: int = 20, query: str = "is:unread") -> List[dict]:
    try:
        service = get_gmail_service(token_dict)
        results = service.users().messages().list(
            userId="me",
            maxResults=max_results,
            q=query,
        ).execute()

        messages = results.get("messages", [])
        emails = []

        for msg in messages:
            msg_detail = service.users().messages().get(
                userId="me",
                id=msg["id"],
                format="full",
            ).execute()

            headers = {h["name"]: h["value"] for h in msg_detail.get("payload", {}).get("headers", [])}
            subject = headers.get("Subject", "(No Subject)")
            sender = headers.get("From", "")
            date = headers.get("Date", "")

            body = _extract_body(msg_detail)

            emails.append({
                "id": msg["id"],
                "subject": subject,
                "sender": sender,
                "date": date,
                "body": body,
                "snippet": msg_detail.get("snippet", ""),
            })

        return emails
    except Exception as e:
        logger.error(f"Gmail fetch error: {e}")
        return []


def mark_as_read(token_dict: dict, message_id: str):
    try:
        service = get_gmail_service(token_dict)
        service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"removeLabelIds": ["UNREAD"]},
        ).execute()
    except Exception as e:
        logger.warning(f"Could not mark email as read: {e}")


def _extract_body(msg_detail: dict) -> str:
    payload = msg_detail.get("payload", {})

    def decode_part(part):
        data = part.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
        return ""

    mime_type = payload.get("mimeType", "")
    if mime_type == "text/plain":
        return decode_part(payload)
    elif mime_type == "text/html":
        from bs4 import BeautifulSoup
        html = decode_part(payload)
        return BeautifulSoup(html, "lxml").get_text()

    parts = payload.get("parts", [])
    for part in parts:
        if part.get("mimeType") == "text/plain":
            return decode_part(part)

    for part in parts:
        if part.get("mimeType") == "text/html":
            from bs4 import BeautifulSoup
            html = decode_part(part)
            return BeautifulSoup(html, "lxml").get_text()

    return msg_detail.get("snippet", "")
