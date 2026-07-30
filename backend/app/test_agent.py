import asyncio
import os
from langchain_core.messages import HumanMessage
from app.agent.graph_agent import build_graph
import logging

logging.basicConfig(level=logging.DEBUG)

async def main():
    os.environ["CEREBRAS_API_KEY"] = "csk-dpmpmhfec9et5vf6yfpvke5t5vke4n38w2twdy2cep4j4rkc"
    agent = build_graph("dummy_token")
    
    state = {
        "messages": [HumanMessage(content="Summarize my unread emails")],
        "user_id": "test_user",
        "access_token": "dummy_token"
    }
    
    try:
        result = await agent.ainvoke(state)
        for msg in result["messages"]:
            print(f"{type(msg).__name__}: {msg.content}")
            if hasattr(msg, 'tool_calls'):
                print(f"Tool calls: {msg.tool_calls}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
