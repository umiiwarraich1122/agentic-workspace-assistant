import asyncio
import os
import sys

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agent.graph_agent import build_graph

async def test_graph():
    # Use dummy tokens and user_id since we just want to test if it runs
    access_token = "dummy"
    user_id = "test_user"
    
    agent = build_graph(access_token, user_id)
    
    thread_state = {
        "messages": [
            ("user", "summarize my mail")
        ],
        "user_id": user_id,
        "access_token": access_token
    }
    
    try:
        result = await agent.ainvoke(thread_state)
        print("Final Output:", result["messages"][-1].content)
    except Exception as e:
        import traceback
        print("Graph Crash:", repr(e))
        traceback.print_exc()

asyncio.run(test_graph())
