import asyncio
from app.agent.graph_agent import build_graph
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

async def main():
    agent = build_graph("dummy_token", "test_user")
    state = {"messages": [HumanMessage(content="What is the top news today?")]}
    
    try:
        async for event in agent.astream_events(state, version="v1"):
            print(event["event"], event.get("name"))
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
