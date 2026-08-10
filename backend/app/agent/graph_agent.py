from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from app.agent.state import AgentState
from app.tools.mail_tools import get_mail_tools
from app.tools.calendar_tools import get_calendar_tools
from app.tools.todo_tools import get_todo_tools
from app.tools.web_tools import get_web_tools
from app.tools.pc_tools import get_pc_tools
from app.tools.reminder_tools import get_reminder_tools
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
        *get_reminder_tools(access_token)
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
        logger.info("Using Groq llama-3.1-8b-instant")
        model = ChatOpenAI(
            model="llama-3.1-8b-instant",
            temperature=0,
            api_key=groq_key,
            base_url="https://api.groq.com/openai/v1",
            timeout=30.0,
            max_retries=2
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

    def call_model(state: AgentState):
        messages = state['messages']
        if not model:
            from langchain_core.messages import AIMessage
            return {"messages": [AIMessage(content="Error: Language model is not configured properly.")]}
            
        from langchain_core.messages import SystemMessage
        
        time_context = f" The user's current device time is {local_time} in the {timezone} timezone. You MUST use this exact time as your reference point whenever resolving relative dates like 'tomorrow', 'next week', or 'at 5pm'." if local_time else ""
        system_prompt_text = (
            "You are Mr. Jarvis, an AI Assistant. You have tools for Gmail, Calendar, Tasks, Web Search, and PC Control. You MUST use tools to execute requests. "
            "IMPORTANT: 1. You may respond in normal plain text for conversational replies and email drafts. "
            "2. ONLY when displaying a list of emails from the database, you MUST output a JSON object with an 'emails' array. "
            "3. When drafting an email, FIRST call the create_email_draft tool, then output the draft in plain text using this EXACT format: '📧 Email 1\\n\\nTo:\\n<recipient>\\n\\nSubject:\\n<subject>\\n\\nBody:\\n<body>', and ask the user 'Would you like me to send this email now?'. If they reply 'yes' or 'send it', use the send_email_draft tool. "
            "4. ALWAYS provide a helpful response in plain text confirming what you have done after executing a tool (e.g., 'I have set the reminder for you.').\n"
            "5. When a tool returns data (like news, tasks, or calendar events), ALWAYS summarize that data in plain text for the user.\n"
            "6. REMINDER RULE: If the user asks you to 'remind me' about something, YOU MUST ONLY USE THE `set_reminder` TOOL. Do NOT draft or send an email unless explicitly asked to send an email.\n\n"
            "ROUTING DIRECTIVES:\n"
            "You are the central router and dispatcher for the Jarvis AI Company agent floor. You must accurately map user intent based on these strict routing rules:\n"
            "1. WEB SEARCH & LIVE DATA INTENT (Target Node: BROWSER): If the user query asks for current events, live information, web searches, news, or real-time data (e.g., 'what is the top news today', 'search for...', 'weather in...', 'latest prices'), you MUST route the agent strictly to use web search tools (like get_latest_news) and act as the BROWSER node. Never process live web queries using internal knowledge (Neural Core).\n"
            "2. FILE PROCESSING & DOCUMENT QUERY INTENT (Target Node: FILES): If the user uploads a document, image, or file and asks a question referencing local content, uploaded files, or document summaries, you MUST act as the FILES node to process it.\n"
            "3. PC CONTROL INTENT (Target Node: SYSTEM): If the user asks you to open a folder, search for a file, or create a folder on their PC, you MUST use the PC Control tools (open_folder, search_files, create_folder).\n"
            "4. REASONING & GENERAL AI INTENT (Target Node: NEURAL CORE): Act as NEURAL CORE only for general knowledge, coding logic, creative writing, or abstract reasoning that does not require live web browsing, local file inspection, or PC control.\n"
            "CRITICAL INSTRUCTION: Analyze the incoming prompt's semantic intent and metadata (such as active file attachments) first before responding."
        )
        system_prompt = SystemMessage(content=system_prompt_text + time_context)
        
        # Keep only recent messages to prevent token quota exceeded (429) errors
        recent_messages = messages[-6:] if len(messages) > 6 else messages
        
        # Ensure system prompt is always at the beginning
        if not recent_messages or not getattr(recent_messages[0], 'type', None) == 'system':
            recent_messages = [system_prompt] + recent_messages
            
        for attempt in range(3):
            try:
                response = model.invoke(recent_messages)
                return {"messages": [response]}
            except Exception as e:
                logger.warning(f"LLM API Attempt {attempt + 1} Warning: {str(e)}")
                if attempt == 2:
                    logger.error(f"LLM API Error after 3 attempts: {str(e)}", exc_info=True)
                    from langchain_core.messages import AIMessage
                    return {"messages": [AIMessage(content=f"Neural Matrix connection temporarily interrupted. Please repeat your prompt: {str(e)}")]}
                time.sleep(1)

    workflow = StateGraph(AgentState)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)
    
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()
