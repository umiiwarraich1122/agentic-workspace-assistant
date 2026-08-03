import asyncio
import base64
from email.message import EmailMessage
import logging
from app.google_api.client import GoogleClient

logger = logging.getLogger(__name__)
GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

async def get_emails(client: GoogleClient, top: int = 10, query: str = None, page_token: str = None):
    """
    Fetch emails from Gmail using the LIST API with metadata format.
    Uses 'metadata' format so we get subject/from/date in ONE call per message
    instead of doing a full GET for each — 3-4x faster.
    """
    url = f"{GMAIL_BASE}/messages"
    params = {"maxResults": top, "format": "metadata"}
    if query:
        params["q"] = query
    if page_token:
        params["pageToken"] = page_token

    try:
        res = await client.get(url, params=params)
        messages_summary = res.get("messages", [])
        next_page_token = res.get("nextPageToken")

        if not messages_summary:
            return [], next_page_token

        # Fetch all email headers in parallel with metadata format (much faster than full format)
        sem = asyncio.Semaphore(8)  # Allow 8 concurrent requests

        async def fetch_meta(item):
            async with sem:
                return await get_email(client, item["id"], format="metadata")

        tasks = [fetch_meta(item) for item in messages_summary[:top]]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        detailed_emails = [r for r in results if isinstance(r, dict)]
        return detailed_emails, next_page_token

    except Exception as e:
        logger.error(f"Error in get_emails: {e}")
        raise


async def get_email(client: GoogleClient, message_id: str, format: str = "metadata"):
    """Fetch a specific email by ID from Gmail. Uses metadata format by default for speed."""
    url = f"{GMAIL_BASE}/messages/{message_id}"
    params = {"format": format}
    if format == "metadata":
        params["metadataHeaders"] = ["Subject", "From", "Date", "To"]

    try:
        res = await client.get(url, params=params)

        headers = res.get("payload", {}).get("headers", [])
        subject = "No Subject"
        sender = "Unknown Sender"
        date = ""
        to = ""

        for h in headers:
            name = h.get("name", "").lower()
            if name == "subject":
                subject = h.get("value", "No Subject")
            elif name == "from":
                sender = h.get("value", "Unknown")
            elif name == "date":
                date = h.get("value", "")
            elif name == "to":
                to = h.get("value", "")

        snippet = res.get("snippet", "")
        label_ids = res.get("labelIds", [])
        internal_date = res.get("internalDate", "0")

        status = []
        if "UNREAD" in label_ids:
            status.append("Unread")
        else:
            status.append("Read")
        if "STARRED" in label_ids:
            status.append("Starred")
        if "IMPORTANT" in label_ids:
            status.append("Important")

        return {
            "id": res.get("id"),
            "subject": subject,
            "from": sender,
            "sender": sender,
            "to": to,
            "receivedDateTime": date,
            "internalDate": internal_date,
            "bodyPreview": snippet,
            "labelIds": label_ids,
            "status": status,
        }
    except Exception as e:
        logger.warning(f"Failed to fetch email {message_id}: {e}")
        return None


async def draft_email(client: GoogleClient, subject: str, body: str, to_recipients: list, sender_email: str = None):
    """Draft a new email in Gmail."""
    mime_message = EmailMessage()
    mime_message["To"] = ", ".join(to_recipients)
    if sender_email:
        mime_message["From"] = sender_email
    mime_message["Subject"] = subject
    mime_message.set_content(body)

    encoded_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode()
    url = f"{GMAIL_BASE}/drafts"
    payload = {"message": {"raw": encoded_message}}
    return await client.post(url, json=payload)


async def modify_email_status(client: GoogleClient, message_id: str, add_labels: list = None, remove_labels: list = None):
    """Modify the labels of an email (mark as read, unread, star, archive)."""
    url = f"{GMAIL_BASE}/messages/{message_id}/modify"
    payload = {}
    if add_labels:
        payload["addLabelIds"] = add_labels
    if remove_labels:
        payload["removeLabelIds"] = remove_labels
    return await client.post(url, json=payload)


async def delete_email(client: GoogleClient, message_id: str):
    """Trash an email."""
    url = f"{GMAIL_BASE}/messages/{message_id}/trash"
    return await client.post(url, json={})

async def send_draft(client: GoogleClient, draft_id: str):
    """Send an existing draft in Gmail."""
    url = f"{GMAIL_BASE}/drafts/send"
    payload = {"id": draft_id}
    return await client.post(url, json=payload)
