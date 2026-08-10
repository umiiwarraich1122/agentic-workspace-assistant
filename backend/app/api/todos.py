from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from app.google_api.client import GoogleClient
from app.google_api.todo import get_todos, create_todo, update_todo, delete_todo
from app.schemas.core import TodoCreateRequest, TodoUpdateRequest
from app.api.emails import get_google_client

router = APIRouter(prefix="/todos", tags=["Todos"])

import logging
logger = logging.getLogger(__name__)

@router.get("/sync")
async def sync_todos(x_user_id: Optional[str] = Header(None), client: GoogleClient = Depends(get_google_client)):
    """Fetch tasks from Google Tasks (Database sync is now disabled)."""
    try:
        tasks = await get_todos(client, top=20)
        return {"status": "success", "synced": len(tasks)}
    except Exception as e:
        logger.error(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def list_todos(list_id: Optional[str] = None, top: int = 10, client: GoogleClient = Depends(get_google_client)):
    """Fetch tasks from Google Tasks."""
    return await get_todos(client, top, list_id)

@router.post("")
async def add_todo(request: TodoCreateRequest, client: GoogleClient = Depends(get_google_client)):
    """Create a task in Google Tasks."""
    return await create_todo(client, request.title, request.content)

@router.patch("/{task_id}")
async def modify_todo(task_id: str, request: TodoUpdateRequest, client: GoogleClient = Depends(get_google_client)):
    """Update task title or completion status in Google Tasks."""
    return await update_todo(client, task_id, request.title, request.status)

@router.delete("/{task_id}")
async def remove_todo(task_id: str, list_id: Optional[str] = None, client: GoogleClient = Depends(get_google_client)):
    """Delete a task from Google Tasks."""
    return await delete_todo(client, task_id, list_id)
