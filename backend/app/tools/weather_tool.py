import os
import aiohttp
import logging
import asyncio
import json
from langchain_core.tools import tool
from app.config import settings

logger = logging.getLogger(__name__)

@tool
async def get_weather(city: str) -> str:
    """
    Get the current weather for a specified city.
    Returns structured JSON data about temperature, condition, humidity, and wind.
    """
    api_key = os.getenv("WEATHER_API_KEY") or getattr(settings, 'WEATHER_API_KEY', None)
    if not api_key:
        return json.dumps({"success": False, "data": None, "error": "Weather API key not configured."})
    
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    weather_data = {
                        "temperature": data.get("main", {}).get("temp"),
                        "feels_like": data.get("main", {}).get("feels_like"),
                        "humidity": data.get("main", {}).get("humidity"),
                        "condition": data.get("weather", [{}])[0].get("description", "Unknown"),
                        "wind_speed": data.get("wind", {}).get("speed"),
                        "city": data.get("name"),
                        "country": data.get("sys", {}).get("country")
                    }
                    
                    return json.dumps({
                        "success": True,
                        "data": weather_data,
                        "error": None
                    })
                elif response.status == 404:
                    return json.dumps({
                        "success": False,
                        "data": None,
                        "error": f"City '{city}' not found."
                    })
                else:
                    return json.dumps({
                        "success": False,
                        "data": None,
                        "error": f"Failed to fetch weather data. HTTP Status: {response.status}"
                    })
    except asyncio.TimeoutError:
        return json.dumps({
            "success": False,
            "data": None,
            "error": "Request to weather service timed out."
        })
    except Exception as e:
        logger.error(f"Error fetching weather for {city}: {e}")
        return json.dumps({
            "success": False,
            "data": None,
            "error": f"An error occurred: {str(e)}"
        })

def get_weather_tools():
    """Returns the weather tools for the agent."""
    return [get_weather]
