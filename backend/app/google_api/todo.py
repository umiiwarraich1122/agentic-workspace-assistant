import logging
from app.google_api.client import GoogleClient

logger = logging.getLogger(__name__)

TASKS_BASE = "https://tasks.googleapis.com/tasks/v1"

async def get_task_lists(client: GoogleClient):
    """Fetch all task lists from Google Tasks."""
    url = f"{TASKS_BASE}/users/@me/lists"
    res = await client.get(url)
    return res.get("items", [])

async def get_todos(client: GoogleClient, top: int = 10, list_id: str = None):
    """Fetch tasks from Google Tasks."""
    if not list_id:
        lists = await get_task_lists(client)
        if lists:
            list_id = lists[0]["id"]
        else:
            return []

    url = f"{TASKS_BASE}/lists/{list_id}/tasks"
    res = await client.get(url, params={"maxResults": top, "showCompleted": False})
    items = res.get("items", [])
    
    formatted_tasks = []
    for item in items:
        formatted_tasks.append({
            "id": item.get("id"),
            "title": item.get("title", "Untitled Task"),
            "status": "completed" if item.get("status") == "completed" else "notStarted",
            "notes": item.get("notes", "")
        })
    return formatted_tasks

async def create_todo(client: GoogleClient, title: str, content: str = "", list_id: str = None):
    """Create a task in Google Tasks."""
    if not list_id:
        lists = await get_task_lists(client)
        if lists:
            list_id = lists[0]["id"]
        else:
            list_id = "@default"

    url = f"{TASKS_BASE}/lists/{list_id}/tasks"
    payload = {
        "title": title,
        "notes": content or ""
    }
    return await client.post(url, json=payload)

async def update_todo(client: GoogleClient, task_id: str, title: str = None, status: str = None, list_id: str = None):
    """Update a task status or title in Google Tasks."""
    if not list_id:
        list_id = "@default"

    url = f"{TASKS_BASE}/lists/{list_id}/tasks/{task_id}"
    payload = {}
    if title:
        payload["title"] = title
    if status:
        payload["status"] = "completed" if status.lower() in ["completed", "done"] else "needsAction"
        
    return await client.patch(url, json=payload)

async def delete_todo(client: GoogleClient, task_id: str, list_id: str = None):
    """Delete a task from Google Tasks."""
    if not list_id:
        list_id = "@default"

    url = f"{TASKS_BASE}/lists/{list_id}/tasks/{task_id}"
    return await client.delete(url)
