import os
import aiohttp
import logging
import asyncio
import json
from langchain_core.tools import tool
from app.config import settings

logger = logging.getLogger(__name__)

async def geocode_location(location: str, api_key: str, session: aiohttp.ClientSession) -> dict:
    """Geocodes a location string using OpenRouteService API."""
    url = f"https://api.openrouteservice.org/geocode/search?api_key={api_key}&text={location}&size=1"
    async with session.get(url, timeout=10) as response:
        if response.status == 200:
            data = await response.json()
            features = data.get("features", [])
            if features:
                coords = features[0].get("geometry", {}).get("coordinates")
                label = features[0].get("properties", {}).get("label")
                if coords:
                    return {"success": True, "lon": coords[0], "lat": coords[1], "label": label}
        return {"success": False, "error": f"Could not find location: {location}"}

@tool
async def get_distance(origin: str, destination: str) -> str:
    """
    Get the driving distance and estimated travel time between two locations.
    Returns structured JSON data including distance (in km) and duration (in minutes).
    """
    api_key = os.getenv("MAP_API_KEY") or getattr(settings, 'MAP_API_KEY', None)
    if not api_key:
        return json.dumps({"success": False, "data": None, "error": "Map API key not configured."})
    
    try:
        async with aiohttp.ClientSession() as session:
            # Geocode origin
            origin_data = await geocode_location(origin, api_key, session)
            if not origin_data["success"]:
                return json.dumps({"success": False, "data": None, "error": origin_data["error"]})
                
            # Geocode destination
            dest_data = await geocode_location(destination, api_key, session)
            if not dest_data["success"]:
                return json.dumps({"success": False, "data": None, "error": dest_data["error"]})
            
            # Calculate distance using OpenRouteService Directions API
            start = f"{origin_data['lon']},{origin_data['lat']}"
            end = f"{dest_data['lon']},{dest_data['lat']}"
            url = f"https://api.openrouteservice.org/v2/directions/driving-car?api_key={api_key}&start={start}&end={end}"
            
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    features = data.get("features", [])
                    if features:
                        summary = features[0].get("properties", {}).get("summary", {})
                        distance_km = round(summary.get("distance", 0) / 1000, 2) # API returns meters
                        duration_mins = round(summary.get("duration", 0) / 60, 2) # API returns seconds
                        
                        route_data = {
                            "origin_resolved": origin_data["label"],
                            "destination_resolved": dest_data["label"],
                            "distance_km": distance_km,
                            "duration_mins": duration_mins
                        }
                        
                        return json.dumps({
                            "success": True,
                            "data": route_data,
                            "error": None
                        })
                    else:
                        return json.dumps({"success": False, "data": None, "error": "No route found between these locations."})
                else:
                    return json.dumps({
                        "success": False,
                        "data": None,
                        "error": f"Failed to calculate route. HTTP Status: {response.status}"
                    })
    except asyncio.TimeoutError:
        return json.dumps({
            "success": False,
            "data": None,
            "error": "Request to map service timed out."
        })
    except Exception as e:
        logger.error(f"Error fetching distance from {origin} to {destination}: {e}")
        return json.dumps({
            "success": False,
            "data": None,
            "error": f"An error occurred: {str(e)}"
        })

def get_map_tools():
    """Returns the map tools for the agent."""
    return [get_distance]
