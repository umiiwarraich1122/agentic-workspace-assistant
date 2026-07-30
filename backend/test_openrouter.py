import asyncio
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

class WeatherTool(BaseModel):
    """Get the weather for a city"""
    city: str = Field(description="The city to get weather for")

async def test_llm():
    model = ChatOpenAI(
        model="openrouter/free",
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1",
        default_headers={"HTTP-Referer": "http://localhost:5173", "X-Title": "Personal Assistant"}
    )
    
    model = model.bind_tools([WeatherTool])
    
    msg = HumanMessage(content="What is the weather in Paris?")
    try:
        resp = await model.ainvoke([msg])
        print("Response:", resp.content)
        print("Tool calls:", resp.tool_calls)
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(test_llm())
