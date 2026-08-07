import asyncio
from livekit.agents import llm
import json
from app.tools.mail_tools import get_mail_tools
from app.tools.calendar_tools import get_calendar_tools
from app.tools.todo_tools import get_todo_tools
from app.tools.web_tools import get_latest_news
from app.tools.pc_tools import get_pc_tools

class JarvisToolBridge(llm.ToolContext):
    def __init__(self, access_token: str, user_id: str):
        super().__init__([])
        self.access_token = access_token
        self.user_id = user_id
        
        # Instantiate the LangChain tools
        mail_tools = get_mail_tools(access_token, user_id)
        calendar_tools = get_calendar_tools(access_token, user_id)
        todo_tools = get_todo_tools(access_token, user_id)
        pc_tools = get_pc_tools()
        
        # Map them by name
        self.lc_tools = {t.name: t for t in mail_tools + calendar_tools + todo_tools + pc_tools}
        self.lc_tools['get_latest_news'] = get_latest_news
        
    def _get_random_filler(self) -> str:
        import random
        return random.choice([
            "Let me check.",
            "One moment.",
            "Checking that now.",
            "Let me pull that up."
        ])

    async def _execute_tool(self, tool_name: str, kwargs: dict, use_filler: bool = False):
        try:
            if use_filler and hasattr(self, "session") and getattr(self, "session", None):
                asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
            
            tool = self.lc_tools.get(tool_name)
            if not tool:
                return f"Tool {tool_name} not found."
                
            if getattr(tool, "coroutine", None):
                return await tool.ainvoke(kwargs)
            return await asyncio.to_thread(tool.invoke, kwargs)
        except Exception as e:
            return f"I couldn't perform this action right now due to an error: {str(e)}"

    @llm.function_tool(description="Fetch the latest top news headlines from BBC News.")
    async def get_latest_news(self) -> str:
        # News requires an external API call, so it's a bit slower. Use filler.
        return await self._execute_tool('get_latest_news', {}, use_filler=True)

    @llm.function_tool(description="Fetch recent email summaries from the Database.")
    async def get_recent_emails(self, top: int = 5) -> str:
        # DB lookup is fast, no filler needed.
        return await self._execute_tool('get_recent_emails', {"top": top}, use_filler=False)

    @llm.function_tool(description="Draft an email.")
    async def create_email_draft(self, to: str, subject: str, body: str) -> str:
        return await self._execute_tool('create_email_draft', {"to_recipients": [to], "subject": subject, "body": body}, use_filler=True)

    @llm.function_tool(description="Send an existing email draft.")
    async def send_email_draft(self, draft_id: str) -> str:
        return await self._execute_tool('send_email_draft', {"draft_id": draft_id}, use_filler=True)

    @llm.function_tool(description="Fetch today's calendar events.")
    async def get_calendar_events(self) -> str:
        # DB lookup is fast
        return await self._execute_tool('get_calendar_events', {}, use_filler=False)

    @llm.function_tool(description="Schedule a new calendar event.")
    async def create_calendar_event(self, summary: str, start_time: str, end_time: str) -> str:
        return await self._execute_tool('create_calendar_event', {"summary": summary, "start_time": start_time, "end_time": end_time}, use_filler=True)

    @llm.function_tool(description="Fetch tasks from the database.")
    async def list_tasks(self) -> str:
        # DB lookup is fast
        return await self._execute_tool('read_tasks', {"top": 10}, use_filler=False)

    @llm.function_tool(description="Create a new task.")
    async def create_task(self, title: str, description: str = "") -> str:
        return await self._execute_tool('add_task', {"title": title, "content": description}, use_filler=True)

    @llm.function_tool(description="Opens a folder or file on the local PC.")
    async def open_folder(self, path_or_name: str) -> str:
        # Fast OS operation
        return await self._execute_tool('open_folder', {"path_or_name": path_or_name}, use_filler=False)

    @llm.function_tool(description="Searches for files on the local PC matching the query.")
    async def search_files(self, query: str, directory: str = "") -> str:
        # OS walk can be slow
        kwargs = {"query": query}
        if directory: kwargs["directory"] = directory
        return await self._execute_tool('search_files', kwargs, use_filler=True)

    @llm.function_tool(description="Creates a new folder on the local PC.")
    async def create_folder(self, folder_name: str, path: str = "") -> str:
        kwargs = {"folder_name": folder_name}
        if path: kwargs["path"] = path
        return await self._execute_tool('create_folder', kwargs, use_filler=False)

