from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    user_id: str
    thread_id: str
    message: str
    local_time: Optional[str] = None
    timezone: Optional[str] = None
    attached_document_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    
class EmailDraftRequest(BaseModel):
    subject: str
    body: str
    to_recipients: List[str]

class EventCreateRequest(BaseModel):
    subject: str
    start_time: str
    end_time: str
    content: Optional[str] = None
    attendees: Optional[List[str]] = None

class EventUpdateRequest(BaseModel):
    subject: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    content: Optional[str] = None

class TodoCreateRequest(BaseModel):
    title: str
    content: Optional[str] = None
    due_date: Optional[str] = None
    list_id: Optional[str] = None

class TodoUpdateRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None # e.g. completed, notStarted
