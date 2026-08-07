from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, List
from pydantic import BaseModel
from app.google_api.client import GoogleClient
from app.google_api.mail import get_emails, get_email, draft_email, modify_email_status, delete_email
from app.schemas.core import EmailDraftRequest
import logging

logger = logging.getLogger(__name__)


class ModifyEmailRequest(BaseModel):
    addLabels: Optional[List[str]] = None
    removeLabels: Optional[List[str]] = None


router = APIRouter(prefix="/emails", tags=["Emails"])


async def get_google_client(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    from app.auth.token_manager import TokenManager
    token = await TokenManager.get_access_token(x_user_id)
    return GoogleClient(token)


@router.get("")
async def list_emails(
    x_user_id: Optional[str] = Header(None),
    client: GoogleClient = Depends(get_google_client),
    top: int = 15,
    query: str = None,
):
    """
    Fetch emails LIVE from Gmail using metadata format (fast).
    No Supabase dependency — always fresh data.
    """
    try:
        emails, next_page_token = await get_emails(client, top=top, query=query)
        return {"emails": emails, "nextPageToken": next_page_token}
    except Exception as e:
        logger.error(f"Error fetching emails: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync")
async def sync_emails(
    x_user_id: Optional[str] = Header(None),
    client: GoogleClient = Depends(get_google_client),
):
    """
    Trigger a background Gmail sync and save to Supabase.
    This is optional — the main /emails endpoint now reads live from Gmail.
    """
    try:
        emails, _ = await get_emails(client, top=5, query="is:unread")
        try:
            from app.database.supabase import get_supabase
            supabase = get_supabase()
            supabase.table("emails").delete().eq("user_id", x_user_id).execute()
            for email in emails:
                sender = email.get("sender") or email.get("from") or "Unknown"
                subject = email.get("subject") or "No Subject"
                body = email.get("bodyPreview") or ""
                summary = f"Email about '{subject}' from {sender}. Preview: {body[:100]}"
                try:
                    supabase.table("emails").insert({
                        "user_id": x_user_id,
                        "sender": sender,
                        "subject": subject,
                        "summary": summary,
                    }).execute()
                except Exception as db_err:
                    logger.warning(f"DB insert failed (non-blocking): {db_err}")
        except Exception as db_conn_err:
            logger.warning(f"Supabase sync skipped: {db_conn_err}")

        return {"status": "success", "synced": len(emails)}
    except Exception as e:
        logger.error(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sync")
async def clear_synced_emails(x_user_id: Optional[str] = Header(None)):
    """Clear emails from Supabase for privacy on logout."""
    try:
        from app.database.supabase import get_supabase
        supabase = get_supabase()
        supabase.table("emails").delete().eq("user_id", x_user_id).execute()
        return {"status": "cleared"}
    except Exception as e:
        logger.error(f"Error clearing emails: {e}")
        return {"status": "error", "detail": str(e)}


@router.get("/{message_id}")
async def read_email(message_id: str, client: GoogleClient = Depends(get_google_client)):
    """Fetch a specific email by ID from Gmail (full format)."""
    return await get_email(client, message_id, format="full")


@router.post("/draft")
async def create_draft(
    request: EmailDraftRequest,
    x_user_id: Optional[str] = Header(None),
    client: GoogleClient = Depends(get_google_client),
):
    """Draft a new email in Gmail."""
    return await draft_email(client, request.subject, request.body, request.to_recipients, sender_email=x_user_id)


@router.post("/{message_id}/modify")
async def modify_email(message_id: str, request: ModifyEmailRequest, client: GoogleClient = Depends(get_google_client)):
    """Modify the labels of an email."""
    return await modify_email_status(client, message_id, request.addLabels, request.removeLabels)


@router.delete("/{message_id}")
async def delete_email_endpoint(message_id: str, client: GoogleClient = Depends(get_google_client)):
    """Trash an email."""
    return await delete_email(client, message_id)
