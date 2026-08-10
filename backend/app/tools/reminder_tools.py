import asyncio
import logging
from langchain_core.tools import tool
from typing import Optional
from langchain_core.runnables.config import RunnableConfig

logger = logging.getLogger(__name__)

# Wait, we can't easily import `send_notification` if it requires user_id without passing user_id to the tool.
# In LangGraph, we can access user_id from config["configurable"]["user_id"].

from pydantic import BaseModel, Field

class ReminderInput(BaseModel):
    message: str = Field(description="The reminder message to show the user. (e.g. 'Drink water')")
    delay_minutes: float = Field(description="How many minutes from now to show the reminder. (e.g. 0.5 for 30 seconds)")

@tool("set_reminder", args_schema=ReminderInput)
async def set_reminder(message: str, delay_minutes: float, config: RunnableConfig) -> str:
    """
    Sets a reminder that will pop up on the user's Jarvis screen after a specified number of minutes.
    Use this tool when the user asks you to remind them about something.
    """
    try:
        user_id = config.get("configurable", {}).get("user_id")
        if not user_id:
            return "Failed to schedule reminder: missing user_id context."
            
        delay_seconds = int(delay_minutes * 60)
        
        # We need to import here to avoid circular imports if any
        from app.api.notifications import send_notification
        
        async def reminder_task():
            try:
                logger.info(f"Scheduled reminder for {user_id} in {delay_seconds} seconds")
                await asyncio.sleep(delay_seconds)
                logger.info(f"Triggering reminder for {user_id}")
                await send_notification(user_id, {
                    "type": "reminder",
                    "title": "Jarvis Reminder",
                    "message": message
                })
            except Exception as e:
                logger.error(f"Reminder task error: {e}")

        # Keep a strong reference to the background task to prevent garbage collection!
        global _background_tasks
        if '_background_tasks' not in globals():
            _background_tasks = set()
            
        task = asyncio.create_task(reminder_task())
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
        
        return f"Reminder successfully scheduled for {delay_minutes} minutes from now."
    except Exception as e:
        logger.error(f"Error scheduling reminder: {e}")
        return f"Failed to schedule reminder: {e}"

def get_reminder_tools():
    return [set_reminder]
