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
            "Hmm, let me check that...",
            "Give me just a second...",
            "Working on it...",
            "Let me look that up...",
            "Alright, one moment...",
            "Let me see..."
        ])

    @llm.function_tool(description="Fetch the latest top news headlines from BBC News.")
    async def get_latest_news(self) -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools['get_latest_news']
        if getattr(tool, "coroutine", None):
            return await tool.ainvoke({})
        return tool.invoke({})

    @llm.function_tool(description="Fetch recent email summaries from the Database.")
    async def get_recent_emails(self, top: int = 5) -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('get_recent_emails')
        if not tool: return "Tool not found."
        return await tool.ainvoke({"top": top})

    @llm.function_tool(description="Draft an email.")
    async def create_email_draft(self, to: str, subject: str, body: str) -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('create_email_draft')
        if not tool: return "Tool not found."
        return await tool.ainvoke({"to_recipients": [to], "subject": subject, "body": body})

    @llm.function_tool(description="Send an existing email draft.")
    async def send_email_draft(self, draft_id: str) -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('send_email_draft')
        if not tool: return "Tool not found."
        return await tool.ainvoke({"draft_id": draft_id})

    @llm.function_tool(description="Fetch today's calendar events.")
    async def get_calendar_events(self) -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('get_calendar_events')
        if not tool: return "Tool not found."
        return await tool.ainvoke({})

    @llm.function_tool(description="Schedule a new calendar event.")
    async def create_calendar_event(self, summary: str, start_time: str, end_time: str) -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('create_calendar_event')
        if not tool: return "Tool not found."
        return await tool.ainvoke({"summary": summary, "start_time": start_time, "end_time": end_time})

    @llm.function_tool(description="Fetch tasks from the database.")
    async def list_tasks(self) -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('read_tasks')  # Fixed: name in todo_tools is read_tasks
        if not tool: return "Error: I do not have access or cannot fetch your tasks."
        return await tool.ainvoke({"top": 10})

    @llm.function_tool(description="Create a new task.")
    async def create_task(self, title: str, description: str = "") -> str:
        tool = self.lc_tools.get('add_task')  # Fixed: name in todo_tools is add_task
        if not tool: return "Tool not found."
        return await tool.ainvoke({"title": title, "content": description})

    @llm.function_tool(description="Opens a folder or file on the local PC.")
    async def open_folder(self, path_or_name: str) -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('open_folder')
        if not tool: return "Tool not found."
        if getattr(tool, "coroutine", None):
            return await tool.ainvoke({"path_or_name": path_or_name})
        return await asyncio.to_thread(tool.invoke, {"path_or_name": path_or_name})

    @llm.function_tool(description="Searches for files on the local PC matching the query.")
    async def search_files(self, query: str, directory: str = "") -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('search_files')
        if not tool: return "Tool not found."
        kwargs = {"query": query}
        if directory:
            kwargs["directory"] = directory
        
        if getattr(tool, "coroutine", None):
            return await tool.ainvoke(kwargs)
        return await asyncio.to_thread(tool.invoke, kwargs)

    @llm.function_tool(description="Creates a new folder on the local PC.")
    async def create_folder(self, folder_name: str, path: str = "") -> str:
        if hasattr(self, "session"):
            asyncio.create_task(self.session.say(self._get_random_filler(), allow_interruptions=True))
        tool = self.lc_tools.get('create_folder')
        if not tool: return "Tool not found."
        kwargs = {"folder_name": folder_name}
        if path:
            kwargs["path"] = path
            
        if getattr(tool, "coroutine", None):
            return await tool.ainvoke(kwargs)
        return await asyncio.to_thread(tool.invoke, kwargs)
