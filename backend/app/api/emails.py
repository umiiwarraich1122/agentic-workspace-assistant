from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, List
from pydantic import BaseModel
from app.google_api.client import GoogleClient
from app.google_api.mail import get_emails, get_email, draft_email, modify_email_status, delete_email
from app.schemas.core import EmailDraftRequest
from app.database.supabase import get_supabase
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

@router.get("/sync")
async def sync_emails(x_user_id: Optional[str] = Header(None), client: GoogleClient = Depends(get_google_client)):
    """Fetch unread emails from Google and save summaries to Supabase to save tokens."""
    try:
        # Fetch latest unread emails
        emails, _ = await get_emails(client, top=10, query="is:unread")
        supabase = get_supabase()
        
        # Clear existing emails for this user to ensure we only keep the latest 10
        supabase.table("emails").delete().eq("user_id", x_user_id).execute()
        
        synced_count = 0
        for email in emails:
            # We use email ID as a check to prevent duplicates if we had an email_id column, 
            # but for simplicity we just store them. Ideally we check if it exists.
            sender = email.get("sender") or email.get("from") or "Unknown"
            subject = email.get("subject") or "No Subject"
            body = email.get("bodyPreview") or ""
            
            # Very basic fast summary for DB
            summary = f"Email about '{subject}' from {sender}. Preview: {body[:100]}"
            
            try:
                supabase.table("emails").insert({
                    "user_id": x_user_id,
                    "sender": sender,
                    "subject": subject,
                    "summary": summary
                }).execute()
                synced_count += 1
            except Exception as db_err:
                logger.error(f"Failed to sync email to DB: {db_err}")
                
        return {"status": "success", "synced": synced_count}
    except Exception as e:
        logger.error(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def list_emails(x_user_id: Optional[str] = Header(None)):
    """Fetch emails from Supabase instead of Google to save LLM tokens."""
    supabase = get_supabase()
    response = supabase.table("emails").select("*").eq("user_id", x_user_id).order("created_at", desc=True).limit(10).execute()
    return {"emails": response.data, "nextPageToken": None}

@router.get("/{message_id}")
async def read_email(message_id: str, client: GoogleClient = Depends(get_google_client)):
    """Fetch a specific email by ID from Gmail."""
    return await get_email(client, message_id)

@router.post("/draft")
async def create_draft(request: EmailDraftRequest, x_user_id: Optional[str] = Header(None), client: GoogleClient = Depends(get_google_client)):
    """Draft a new email in Gmail."""
    return await draft_email(client, request.subject, request.body, request.to_recipients, sender_email=x_user_id)

@router.post("/{message_id}/modify")
async def modify_email(message_id: str, request: ModifyEmailRequest, client: GoogleClient = Depends(get_google_client)):
    """Modify the labels of an email."""
    return await modify_email_status(client, message_id, request.addLabels, request.removeLabels)

@router.delete("/{message_id}")
async def delete_email_endpoint(message_id: str, client: GoogleClient = Depends(get_google_client)):
    """Delete an email."""
    return await delete_email(client, message_id)
