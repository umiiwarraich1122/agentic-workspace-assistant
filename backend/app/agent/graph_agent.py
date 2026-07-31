from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from app.agent.state import AgentState
from app.tools.mail_tools import get_mail_tools
from app.tools.calendar_tools import get_calendar_tools
from app.tools.todo_tools import get_todo_tools
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
        *get_todo_tools(access_token, user_id)
    ]
    
    # Get OpenRouter API key from config settings
    api_key = settings.OPENROUTER_API_KEY
    
    try:
        model = ChatOpenAI(
            model="openrouter/free",
            temperature=0, 
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=30.0,
            max_retries=3,
            default_headers={"HTTP-Referer": "http://localhost:5173", "X-Title": "Personal Assistant"}
        )
        model = model.bind_tools(tools)
    except Exception as e:
        logger.error(f"Failed to initialize ChatOpenAI: {e}")
        model = None
        
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
        system_prompt = SystemMessage(content="You are Mr. Jarvis, an AI Assistant. You have tools for Gmail, Calendar, and Tasks. You MUST use tools to execute requests. IMPORTANT: 1. You may respond in normal plain text for conversational replies and email drafts. 2. ONLY when displaying a list of emails from the database, you MUST output a JSON object with an 'emails' array. 3. When drafting an email, FIRST call the create_email_draft tool, then output the draft in plain text using this EXACT format: '📧 Email 1\\n\\nTo:\\n<recipient>\\n\\nSubject:\\n<subject>\\n\\nBody:\\n<body>'. 4. Be extremely concise to save tokens." + time_context)
        
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
