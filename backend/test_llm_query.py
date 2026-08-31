import asyncio
import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.agent.graph_agent import build_graph
from langchain_core.messages import HumanMessage

async def main():
    agent = build_graph("dummy_token", "101364283624371099606", None, None)
    
    thread_state = {
        "messages": [HumanMessage(content="which repo has more commit in the github repo")]
    }
    
    try:
        async for chunk in agent.astream(thread_state, config={"configurable": {"thread_id": "test_thread", "user_id": "101364283624371099606"}}):
            for node_name, node_state in chunk.items():
                print(f"--- {node_name} ---")
                messages = node_state.get("messages", [])
                if messages:
                    msg = messages[-1]
                    print(msg)
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
