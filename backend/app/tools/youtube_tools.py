import os
import httpx
import logging
from langchain_core.tools import tool
from app.api.youtube import get_state, save_state

logger = logging.getLogger(__name__)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

@tool
def youtube_play_music(query: str) -> str:
    """
    Search YouTube and play the resulting song/music video.
    Args:
        query: The song name, artist, or description to search for.
    """
    if not YOUTUBE_API_KEY:
        return "YouTube API Key is missing. Cannot search."
        
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "maxResults": 1,
        "q": query,
        "type": "video",
        "videoCategoryId": "10", # Music category
        "key": YOUTUBE_API_KEY
    }
    
    try:
        response = httpx.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("items"):
            # Try again without music category constraint
            del params["videoCategoryId"]
            response = httpx.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("items"):
                return f"No results found on YouTube for '{query}'"
                
        item = data["items"][0]
        video_id = item["id"]["videoId"]
        title = item["snippet"]["title"]
        thumbnail = item["snippet"]["thumbnails"]["high"]["url"]
        
        state = get_state()
        state.update({
            "video_id": video_id,
            "title": title,
            "thumbnail": thumbnail,
            "playing": True,
            "action_id": state.get("action_id", 0) + 1
        })
        save_state(state)
        
        return f"Successfully found and started playing: {title}"
        
    except Exception as e:
        logger.error(f"YouTube search failed: {e}")
        return f"Failed to play music: {str(e)}"

@tool
def youtube_pause_music() -> str:
    """Pause the currently playing YouTube music."""
    state = get_state()
    if not state.get("video_id"):
        return "No music is currently playing."
    state["playing"] = False
    state["action_id"] = state.get("action_id", 0) + 1
    save_state(state)
    return "Music paused."

@tool
def youtube_resume_music() -> str:
    """Resume the paused YouTube music."""
    state = get_state()
    if not state.get("video_id"):
        return "No music is currently loaded to resume."
    state["playing"] = True
    state["action_id"] = state.get("action_id", 0) + 1
    save_state(state)
    return "Music resumed."

@tool
def youtube_get_current_track() -> str:
    """Get the name of the currently playing or paused YouTube track."""
    state = get_state()
    if not state.get("video_id"):
        return "No track is currently loaded."
    
    status = "playing" if state["playing"] else "paused"
    return f"Currently {status}: {state['title']}"

def get_youtube_tools():
    """Returns list of YouTube tools for LangChain."""
    return [
        youtube_play_music,
        youtube_pause_music,
        youtube_resume_music,
        youtube_get_current_track
    ]
