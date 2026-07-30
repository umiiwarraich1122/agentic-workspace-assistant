from datetime import datetime, timezone
import logging
from fastapi import HTTPException
from app.google_api.client import GoogleClient

logger = logging.getLogger(__name__)

CALENDAR_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

async def get_events(client: GoogleClient, top: int = 20):
    """Fetch upcoming events from Google Calendar."""
    now_iso = datetime.now(timezone.utc).isoformat()
    params = {
        "maxResults": top,
        "orderBy": "startTime",
        "singleEvents": True,
        "timeMin": now_iso
    }
    res = await client.get(CALENDAR_BASE, params=params)
    items = res.get("items", [])
    
    formatted_events = []
    
    for item in items:
        summary = item.get("summary", "Untitled Event")
        start_raw = item.get("start", {}).get("dateTime") or item.get("start", {}).get("date")
        end_raw = item.get("end", {}).get("dateTime") or item.get("end", {}).get("date")
        
        date_str = start_raw or ""
        time_str = "All Day"
        if start_raw and "T" in start_raw:
            try:
                dt = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
                time_str = dt.strftime("%I:%M %p")
            except Exception:
                time_str = start_raw.split("T")[1][:5]
                
        formatted_events.append({
            "id": item.get("id"),
            "subject": summary,
            "start": {"dateTime": start_raw},
            "end": {"dateTime": end_raw},
            "date": date_str,
            "time": time_str,
            "start_time": start_raw,
            "description": item.get("description", ""),
            "location": item.get("location", "")
        })
        
    return formatted_events

async def create_event(client: GoogleClient, subject: str, start_time: str, end_time: str, content: str = "", attendees: list = None):
    """Create a new event in Google Calendar."""
    payload = {
        "summary": subject,
        "description": content or "",
        "start": {"dateTime": start_time},
        "end": {"dateTime": end_time}
    }
    if attendees:
        payload["attendees"] = [{"email": a} for a in attendees]
        
    return await client.post(CALENDAR_BASE, json=payload)

async def update_event(client: GoogleClient, event_id: str, updates: dict):
    """Update an existing event in Google Calendar."""
    url = f"{CALENDAR_BASE}/{event_id}"
    payload = {}
    if "subject" in updates:
        payload["summary"] = updates["subject"]
    if "content" in updates:
        payload["description"] = updates["content"]
    if "start_time" in updates:
        payload["start"] = {"dateTime": updates["start_time"]}
    if "end_time" in updates:
        payload["end"] = {"dateTime": updates["end_time"]}
        
    return await client.patch(url, json=payload)

async def delete_event(client: GoogleClient, event_id: str):
    """Delete an event from Google Calendar."""
    url = f"{CALENDAR_BASE}/{event_id}"
    try:
        await client.delete(url)
        return {"status": "success", "message": "Event deleted successfully"}
    except HTTPException as e:
        logger.warning(f"Google Calendar delete warning for event {event_id}: {e.detail}")
        # Re-raise the exception so the frontend knows it failed
        raise e
