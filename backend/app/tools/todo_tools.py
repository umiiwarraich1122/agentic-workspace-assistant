from langchain_core.tools import tool
from typing import Optional
from app.google_api.todo import get_todos, create_todo, update_todo, delete_todo
from app.google_api.client import GoogleClient

def get_todo_tools(access_token: str, user_id: str):
    client = GoogleClient(access_token)
    
    @tool
    async def read_tasks(top: int = 10) -> str:
        """Fetch the user's tasks from the Database to save tokens."""
        from app.database.supabase import get_supabase
        import json
        try:
            supabase = get_supabase()
            response = supabase.table("tasks").select("*").eq("user_id", user_id).limit(top).execute()
            tasks = response.data
            if not tasks:
                return "No tasks found in the database. You might need to sync first."
            formatted = []
            for t in tasks:
                formatted.append({
                    "id": str(t.get("id")),
                    "title": t.get("title"),
                    "status": t.get("status"),
                    "notes": t.get("notes", "")
                })
            return json.dumps(formatted)
        except Exception as e:
            return f"Error reading tasks from database: {str(e)}"

    @tool
    async def add_task(title: str, content: Optional[str] = None) -> str:
        """Create a new task in Google Tasks."""
        try:
            result = await create_todo(client, title, content)
            return f"Google Task created successfully. Task ID: {result.get('id')}"
        except Exception as e:
            return f"Error creating task: {str(e)}"

    @tool
    async def modify_task(task_id: str, title: Optional[str] = None, status: Optional[str] = None) -> str:
        """Update a Google Task. Status can be 'completed' or 'needsAction'."""
        try:
            result = await update_todo(client, task_id, title=title, status=status)
            return f"Google Task updated successfully. Task ID: {result.get('id')}"
        except Exception as e:
            return f"Error updating task: {str(e)}"

    @tool
    async def remove_task(task_id: str) -> str:
        """Delete a task from Google Tasks by ID or title."""
        try:
            target_id = task_id
            if " " in task_id or len(task_id) < 15:
                all_tasks = await get_todos(client, 30)
                for t in all_tasks:
                    if task_id.lower() in t.get("title", "").lower():
                        target_id = t.get("id")
                        break

            await delete_todo(client, target_id)
            return f"Google Task '{task_id}' deleted successfully."
        except Exception as e:
            return f"Error deleting task: {str(e)}"

    return [read_tasks, add_task, modify_task, remove_task]
