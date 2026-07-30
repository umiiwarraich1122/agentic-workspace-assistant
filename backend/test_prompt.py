import os
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AIMessage

os.environ["CEREBRAS_API_KEY"] = "csk-dpmpmhfec9et5vf6yfpvke5t5vke4n38w2twdy2cep4j4rkc"

async def test_llm():
    model = ChatOpenAI(
        model="gpt-oss-120b",
        temperature=0, 
        base_url="https://api.cerebras.ai/v1"
    )
    
    sys_msg = SystemMessage(content="You are Mr. Jarvis, an advanced AI Assistant. You have access to Google Workspace tools to read and draft Gmail emails, check Google Calendar, schedule meetings, and manage Google Tasks. You MUST use these tools to execute the user's requests. Never say you cannot execute a task if a tool exists for it. IMPORTANT INSTRUCTIONS: 1. You MUST ALWAYS output your final response as a valid JSON object exactly matching this structure: {\"message\": \"Conversational text here\", \"table\": {\"type\": \"emails|tasks|calendar\", \"columns\": [\"Col1\", \"Col2\"], \"rows\": [[\"Val1\", \"Val2\"]]}}. If no table is needed, omit the 'table' field. Do not wrap the JSON in markdown code blocks. 2. For emails, the columns MUST be exactly ['Sender', 'Subject', 'Quick Take']. Generate the Quick Take using the preview snippet. 3. When displaying a specific email, explicitly ask the user in the 'message' field if they would like you to generate a draft reply.")
    
    human = HumanMessage(content="Summarize my unread emails")
    
    ai_tool_call = AIMessage(content="", tool_calls=[{"name": "get_recent_emails", "args": {"top": 5}, "id": "call_123", "type": "tool_call"}])
    
    tool_resp = ToolMessage(content="1. From: Alice | Subject: Meeting | Preview: Let's meet tomorrow | ID: 123\n2. From: Bob | Subject: Report | Preview: Here is the report | ID: 456", tool_call_id="call_123")
    
    response = model.invoke([sys_msg, human, ai_tool_call, tool_resp])
    
    print("LLM Response:\n", response.content)

if __name__ == "__main__":
    asyncio.run(test_llm())
