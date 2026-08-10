from langchain_core.tools import tool
from typing import List, Optional
from app.google_api.calendar import get_events, create_event, update_event, delete_event
from app.google_api.client import GoogleClient
import json

def get_calendar_tools(access_token: str, user_id: str):
    client = GoogleClient(access_token)
    
    @tool
    async def read_calendar(top: int = 10) -> str:
        """Fetch the user's upcoming events from Google Calendar."""
        try:
            from app.google_api.calendar import get_events
            import json
            events = await get_events(client, top=top)
            if not events:
                return "No upcoming events found in the calendar."
            formatted = []
            for ev in events:
                formatted.append({
                    "id": str(ev.get("id")),
                    "subject": ev.get("subject") or ev.get("title"),
                    "date": ev.get("date"),
                    "time": ev.get("time")
                })
            return json.dumps(formatted)
        except Exception as e:
            return f"Error reading calendar from Google API: {str(e)}"

    @tool
    async def schedule_event(subject: str, start_time: str, end_time: str, content: Optional[str] = None, attendees: Optional[List[str]] = None) -> str:
        """Create a new Google Calendar event. Time format should be ISO 8601 string e.g. 2026-07-29T12:00:00Z."""
        try:
            result = await create_event(client, subject, start_time, end_time, content, attendees)
            return f"Google Calendar event created successfully. Event ID: {result.get('id')}"
        except Exception as e:
            error_msg = str(e)
            return f"I tried to schedule the meeting in Google Calendar, but encountered an error: {error_msg}"

    @tool
    async def modify_event(event_id: str, updates_json: str) -> str:
        """Update a Google Calendar event. Updates must be a JSON string with optional keys: subject, start_time, end_time, content."""
        try:
            updates = json.loads(updates_json)
            result = await update_event(client, event_id, updates)
            return f"Google Calendar event updated successfully. Event ID: {result.get('id')}"
        except Exception as e:
            return f"Error updating event: {str(e)}"
            
    @tool
    async def remove_event(event_id: str) -> str:
        """Delete a Google Calendar event by ID or event title/query."""
        try:
            target_id = event_id
            if " " in event_id or len(event_id) < 15:
                all_events = await get_events(client, 30)
                for ev in all_events:
                    if event_id.lower() in ev.get("subject", "").lower():
                        target_id = ev.get("id")
                        break

            await delete_event(client, target_id)
            return f"Google Calendar event '{event_id}' deleted successfully."
        except Exception as e:
            return f"Error deleting event: {str(e)}"

    return [read_calendar, schedule_event, modify_event, remove_event]
