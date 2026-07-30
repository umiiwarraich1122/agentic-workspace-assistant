from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from app.google_api.client import GoogleClient
from app.google_api.calendar import get_events, create_event, update_event, delete_event
from app.schemas.core import EventCreateRequest, EventUpdateRequest
from app.api.emails import get_google_client
from app.services.memory_store import store
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("/sync")
async def sync_calendar(x_user_id: Optional[str] = Header(None), client: GoogleClient = Depends(get_google_client)):
    """Fetch calendar events from Google and save to Supabase to save tokens."""
    try:
        events = await get_events(client, top=10)
        from app.database.supabase import get_supabase
        supabase = get_supabase()
        
        synced_count = 0
        for ev in events:
            # Upsert by some unique key if available, but for now just insert/clear or simple insert
            # We will first clear existing future events for this user to avoid duplicates on sync
            pass
            
        # Clear existing
        supabase.table("calendar").delete().eq("user_id", x_user_id).execute()
        
        for ev in events:
            try:
                supabase.table("calendar").insert({
                    "user_id": x_user_id,
                    "subject": ev.get("subject") or ev.get("title") or "Busy",
                    "date": ev.get("date") or "",
                    "time": ev.get("time") or ""
                }).execute()
                synced_count += 1
            except Exception as db_err:
                logger.error(f"Failed to sync event to DB: {db_err}")
                
        return {"status": "success", "synced": synced_count}
    except Exception as e:
        logger.error(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def list_events(client: GoogleClient = Depends(get_google_client), x_user_id: Optional[str] = Header(None), top: int = 10):
    """Fetch upcoming Google Calendar events."""
    events = await get_events(client, top)
    if x_user_id:
        hidden = store.get_hidden_events(x_user_id)
        events = [e for e in events if e.get("id") not in hidden]
    return events

@router.post("")
async def schedule_event(request: EventCreateRequest, client: GoogleClient = Depends(get_google_client)):
    """Create a new event in Google Calendar."""
    return await create_event(client, request.subject, request.start_time, request.end_time, request.content, request.attendees)

@router.patch("/{event_id}")
async def modify_event(event_id: str, request: EventUpdateRequest, client: GoogleClient = Depends(get_google_client)):
    """Update a specific Google Calendar event."""
    return await update_event(client, event_id, request.model_dump(exclude_unset=True))

@router.delete("/{event_id}")
async def remove_event(event_id: str, client: GoogleClient = Depends(get_google_client), x_user_id: Optional[str] = Header(None)):
    """Delete a event from Google Calendar."""
    try:
        return await delete_event(client, event_id)
    except HTTPException as e:
        if e.status_code == 403 and x_user_id:
            logger.info(f"Soft-hiding read-only event {event_id} for user {x_user_id}")
            store.hide_event(x_user_id, event_id)
            return {"status": "success", "message": "Read-only event permanently hidden from view"}
        raise e
