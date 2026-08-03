import asyncio
from app.agent.graph_agent import build_graph
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import json

load_dotenv()

async def main():
    agent = build_graph("dummy_token", "test_user", "2026-08-03T10:00:00Z", "UTC")
    state = {"messages": [HumanMessage(content="What is the top news today?")]}
    
    try:
        async for chunk in agent.astream(state):
            for node_name, node_state in chunk.items():
                print("NODE:", node_name)
                messages = node_state.get("messages", [])
                if messages:
                    last_msg = messages[-1]
                    if node_name == "agent":
                        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                            print("TOOL_CALLS:", last_msg.tool_calls)
                        elif hasattr(last_msg, "content") and last_msg.content:
                            print("FINAL_MESSAGE:", last_msg.content)
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
