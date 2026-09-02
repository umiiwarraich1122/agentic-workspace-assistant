from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from app.agent.state import AgentState
from app.tools.mail_tools import get_mail_tools
from app.tools.calendar_tools import get_calendar_tools
from app.tools.todo_tools import get_todo_tools
from app.tools.web_tools import get_web_tools
from app.tools.pc_tools import get_pc_tools
from app.tools.reminder_tools import get_reminder_tools
from app.tools.weather_tool import get_weather_tools
from app.tools.map_tool import get_map_tools
from app.tools.document_tool import get_document_tools
from app.tools.pantry_tools import get_pantry_tools
from app.tools.github_tools import get_github_mcp_tools
from app.tools.youtube_tools import get_youtube_tools
from app.agent.evaluator import evaluate_tool_results
from app.config import settings
from langgraph.prebuilt import ToolNode
import logging
import os
import time

logger = logging.getLogger(__name__)

def build_graph(access_token: str, user_id: str, local_time: str = None, timezone: str = None):
    # Initialize tools with the user's access token
    tools = [
        *get_mail_tools(access_token, user_id),
        *get_calendar_tools(access_token, user_id),
        *get_todo_tools(access_token, user_id),
        *get_web_tools(),
        *get_pc_tools(),
        *get_reminder_tools(access_token),
        *get_weather_tools(),
        *get_map_tools(),
        *get_document_tools(),
        *get_pantry_tools(user_id),
        *get_github_mcp_tools(),
        *get_youtube_tools()
    ]
    
    # Model selection logic:
    # 1. OpenRouter (primary preference requested by user)
    # 2. OpenAI
    # 3. Cerebras
    openai_key = os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY
    cerebras_key = os.getenv("CEREBRAS_API_KEY") or settings.CEREBRAS_API_KEY
    openrouter_key = os.getenv("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY
    groq_key = os.getenv("GROQ_API_KEY") or getattr(settings, 'GROQ_API_KEY', None)

    model = None

    if groq_key:
        logger.info("Using Groq openai/gpt-oss-120b")
        from langchain_groq import ChatGroq
        model = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0,
            api_key=groq_key,
            timeout=15.0,
            max_retries=0
        )
    elif openrouter_key:
        logger.info("Using OpenRouter")
        model = ChatOpenAI(
            model="openrouter/free",
            temperature=0,
            api_key=openrouter_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=30.0,
            max_retries=2,
            default_headers={"HTTP-Referer": "http://localhost:5173", "X-Title": "Personal Assistant"}
        )
    elif openai_key:
        logger.info("Using OpenAI gpt-4o-mini")
        model = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=openai_key,
            timeout=30.0,
            max_retries=2
        )
    elif cerebras_key:
        logger.info("Using Cerebras")
        model = ChatOpenAI(
            model="gpt-oss-120b",
            temperature=0,
            api_key=cerebras_key,
            base_url="https://api.cerebras.ai/v1",
            timeout=30.0
        )

    if model:
        model = model.bind_tools(tools)
    else:
        logger.error("No valid LLM model could be initialized.")
        
    tool_node = ToolNode(tools)

    def should_continue(state: AgentState):
        messages = state['messages']
        last_message = messages[-1]
        if last_message.tool_calls:
            return "tools"
        return END
        
    def should_retry(state: AgentState):
        messages = state['messages']
        # If the evaluator added a HumanMessage, we need to route back to agent
        from langchain_core.messages import HumanMessage
        if isinstance(messages[-1], HumanMessage) and "[SYSTEM SELF-CORRECTION]" in str(messages[-1].content):
            return "agent"
        return "agent" # After evaluation, agent decides what to do next with the tool output

    def call_model(state: AgentState):
        messages = state['messages']
        if not model:
            from langchain_core.messages import AIMessage
            return {"messages": [AIMessage(content="Error: Language model is not configured properly.")]}
            
        from langchain_core.messages import SystemMessage
        
        time_context = f" The user's current device time is {local_time} in the {timezone} timezone. You MUST use this exact time as your reference point whenever resolving relative dates like 'tomorrow', 'next week', or 'at 5pm'." if local_time else ""
        system_prompt_text = (
            "You are Jarvis. You have tools for Gmail, Calendar, Tasks, Web Search, PC Control, Weather, Maps, Document Search, and Smart Pantry. "
            "1. Output plain text for normal conversational replies. "
            "2. When displaying a list of emails, ONLY output a JSON object with an 'emails' array. "
            "3. Drafting emails: FIRST call create_email_draft, then output '📧 Email 1\\nTo: <recipient>\\nSubject: <subject>\\nBody: <body>' and ask if they want to send. "
            "4. Summarize tool data (news, calendar, pantry) in plain text. "
            "5. 'Remind me' -> Use set_reminder tool. "
            "RULES: Use BROWSER tools for live/web data. Use FILES tools for docs. Use PC tools for OS. Use Pantry tools for groceries. Use GITHUB tools for code, repositories, and commits."
        )
        system_prompt = SystemMessage(content=system_prompt_text + time_context)
        
        # Keep only recent messages to prevent token quota exceeded (429) errors
        # We need to ensure we don't break the AIMessage -> ToolMessage sequence
        # So we look backwards for the last HumanMessage or the start of the current tool execution chain
        from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
        
        recent_messages = messages[-4:] if len(messages) > 4 else messages
        
        # Ensure we don't start with a ToolMessage (which requires a preceding AIMessage with tool_calls)
        while recent_messages and isinstance(recent_messages[0], ToolMessage):
            recent_messages.pop(0)
            
        # Truncate extremely long contents to avoid hitting the 6000 TPM Groq limit
        truncated_messages = []
        for msg in recent_messages:
            msg_content = msg.content
            if isinstance(msg_content, str) and len(msg_content) > 1000:
                msg.content = msg_content[:1000] + "... [TRUNCATED]"
            truncated_messages.append(msg)
            
        recent_messages = truncated_messages
        
        # Ensure system prompt is always at the beginning
        if not recent_messages or getattr(recent_messages[0], 'type', None) != 'system':
            recent_messages = [system_prompt] + recent_messages
            
        for attempt in range(1):
            try:
                response = model.invoke(recent_messages)
                return {"messages": [response]}
            except Exception as e:
                logger.error(f"LLM API Error: {str(e)}", exc_info=True)
                from langchain_core.messages import AIMessage
                return {"messages": [AIMessage(content=f"Neural Matrix connection temporarily interrupted. Please repeat your prompt: {str(e)}")]}

    workflow = StateGraph(AgentState)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)
    workflow.add_node("evaluator", evaluate_tool_results)
    
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    workflow.add_edge("tools", "evaluator")
    workflow.add_conditional_edges("evaluator", should_retry, {"agent": "agent"})
    
    return workflow.compile()
