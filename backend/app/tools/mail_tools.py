from langchain_core.tools import tool
from typing import List
from app.google_api.mail import draft_email, send_draft
from app.google_api.client import GoogleClient
from app.database.supabase import get_supabase
import json

def get_mail_tools(access_token: str, user_id: str):
    client = GoogleClient(access_token)
    
    @tool
    async def get_recent_emails(top: int = 5, query: str = None) -> str:
        """Fetch email summaries from the Database to save tokens. Do not query Google API directly unless drafting."""
        try:
            supabase = get_supabase()
            # Fetch from DB instead of Google
            response = supabase.table("emails").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(top).execute()
            
            emails = response.data
            if not emails:
                return "No emails found in the database. You might need to sync first."
                
            formatted = []
            for e in emails:
                formatted.append({
                    "id": str(e.get("id")),
                    "sender": e.get("sender"),
                    "subject": e.get("subject"),
                    "summary": e.get("summary")
                })
            return json.dumps(formatted)
        except Exception as e:
            return f"Error reading emails from database: {str(e)}"
            
    @tool
    async def create_email_draft(subject: str, body: str, to_recipients: List[str]) -> str:
        """Draft a new email in Gmail. IMPORTANT: This saves as a draft in Gmail."""
        try:
            from app.services.memory_store import store
            tokens = store.get_tokens(user_id)
            actual_email = None
            if tokens and "user_profile" in tokens:
                actual_email = tokens["user_profile"].get("email")

            result = await draft_email(client, subject, body, to_recipients, sender_email=actual_email)
            return f"Gmail draft created successfully. Draft ID: {result.get('id')}"
        except Exception as e:
            return f"Error drafting email: {str(e)}"

    @tool
    async def send_email_draft(draft_id: str) -> str:
        """Send an existing email draft in Gmail. Requires the draft ID. IMPORTANT: You must ONLY call this if the user explicitly says 'send it' or 'yes' after you drafted an email."""
        try:
            result = await send_draft(client, draft_id)
            return f"Draft sent successfully! Message is now sent."
        except Exception as e:
            return f"Error sending draft: {str(e)}"

    return [get_recent_emails, create_email_draft, send_email_draft]
