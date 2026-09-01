import logging
from langchain.tools import tool
from pydantic import BaseModel, Field
import spotipy
from app.api.spotify import get_spotify_client

logger = logging.getLogger(__name__)

class SpotifyPlayInput(BaseModel):
    query: str = Field(default="", description="Optional search query to play a specific song, artist, or album. Leave empty to just resume current playback.")

@tool("spotify_play_music", args_schema=SpotifyPlayInput)
def spotify_play_music(query: str = "") -> str:
    """Plays music on Spotify. Optionally searches for a specific track, artist, or album to play."""
    try:
        sp = get_spotify_client()
        if not query:
            sp.start_playback()
            return "Resumed Spotify playback."
            
        results = sp.search(q=query, limit=1, type='track,album,artist')
        
        if results['tracks']['items']:
            track_uri = results['tracks']['items'][0]['uri']
            sp.start_playback(uris=[track_uri])
            return f"Playing track: {results['tracks']['items'][0]['name']}"
            
        if results['albums']['items']:
            album_uri = results['albums']['items'][0]['uri']
            sp.start_playback(context_uri=album_uri)
            return f"Playing album: {results['albums']['items'][0]['name']}"
            
        if results['artists']['items']:
            artist_uri = results['artists']['items'][0]['uri']
            sp.start_playback(context_uri=artist_uri)
            return f"Playing artist: {results['artists']['items'][0]['name']}"
            
        return f"Could not find anything on Spotify matching '{query}'"
    except spotipy.SpotifyException as e:
        logger.error(f"Spotify play error: {e}")
        return f"Failed to play music. Make sure you have an active Spotify device open. Error: {e}"
    except Exception as e:
        return f"Error: {str(e)}"

@tool("spotify_pause_music")
def spotify_pause_music() -> str:
    """Pauses the current Spotify playback."""
    try:
        sp = get_spotify_client()
        sp.pause_playback()
        return "Paused Spotify playback."
    except Exception as e:
        return f"Failed to pause music. Error: {e}"

@tool("spotify_next_track")
def spotify_next_track() -> str:
    """Skips to the next track on Spotify."""
    try:
        sp = get_spotify_client()
        sp.next_track()
        return "Skipped to the next track on Spotify."
    except Exception as e:
        return f"Failed to skip track. Error: {e}"

@tool("spotify_get_current_track")
def spotify_get_current_track() -> str:
    """Gets information about the currently playing track on Spotify."""
    try:
        sp = get_spotify_client()
        current = sp.current_playback()
        if not current or not current.get('item'):
            return "No music is currently playing on Spotify."
            
        item = current['item']
        artist_names = ", ".join([a['name'] for a in item['artists']])
        return f"Currently playing: {item['name']} by {artist_names}."
    except Exception as e:
        return f"Failed to get current track. Error: {e}"

def get_spotify_tools():
    return [spotify_play_music, spotify_pause_music, spotify_next_track, spotify_get_current_track]
