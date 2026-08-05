import asyncio
from livekit.agents import llm
import json
from app.tools.mail_tools import get_mail_tools
from app.tools.calendar_tools import get_calendar_tools
from app.tools.todo_tools import get_todo_tools
from app.tools.web_tools import get_latest_news

class JarvisToolBridge(llm.ToolContext):
    def __init__(self, access_token: str, user_id: str):
        super().__init__()
        self.access_token = access_token
        self.user_id = user_id
        
        # Instantiate the LangChain tools
        mail_tools = get_mail_tools(access_token, user_id)
        calendar_tools = get_calendar_tools(access_token, user_id)
        todo_tools = get_todo_tools(access_token, user_id)
        
        # Map them by name
        self.lc_tools = {t.name: t for t in mail_tools + calendar_tools + todo_tools}
        self.lc_tools['get_latest_news'] = get_latest_news

    @llm.function_tool(description="Fetch the latest top news headlines from BBC News.")
    async def get_latest_news(self) -> str:
        # LangChain tool invoke
        if asyncio.iscoroutinefunction(self.lc_tools['get_latest_news'].func):
            return await self.lc_tools['get_latest_news'].func()
        return self.lc_tools['get_latest_news'].func()

    @llm.function_tool(description="Fetch recent email summaries from the Database.")
    async def get_recent_emails(self, top: int = 5) -> str:
        tool = self.lc_tools.get('get_recent_emails')
        if not tool: return "Tool not found."
        return await tool.func(top=top)

    @llm.function_tool(description="Draft an email.")
    async def create_email_draft(self, to: str, subject: str, body: str) -> str:
        tool = self.lc_tools.get('create_email_draft')
        if not tool: return "Tool not found."
        return await tool.func(to=to, subject=subject, body=body)

    @llm.function_tool(description="Send an existing email draft.")
    async def send_email_draft(self, draft_id: str) -> str:
        tool = self.lc_tools.get('send_email_draft')
        if not tool: return "Tool not found."
        return await tool.func(draft_id=draft_id)

    @llm.function_tool(description="Fetch today's calendar events.")
    async def get_calendar_events(self) -> str:
        tool = self.lc_tools.get('get_calendar_events')
        if not tool: return "Tool not found."
        return await tool.func()

    @llm.function_tool(description="Schedule a new calendar event.")
    async def create_calendar_event(self, summary: str, start_time: str, end_time: str) -> str:
        tool = self.lc_tools.get('create_calendar_event')
        if not tool: return "Tool not found."
        return await tool.func(summary=summary, start_time=start_time, end_time=end_time)

    @llm.function_tool(description="Fetch tasks from the database.")
    async def list_tasks(self) -> str:
        tool = self.lc_tools.get('list_tasks')
        if not tool: return "Tool not found."
        return await tool.func()

    @llm.function_tool(description="Create a new task.")
    async def create_task(self, title: str, description: str = "") -> str:
        tool = self.lc_tools.get('create_task')
        if not tool: return "Tool not found."
        return await tool.func(title=title, description=description)
