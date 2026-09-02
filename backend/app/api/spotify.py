import os
import json
import logging
import urllib.parse
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/spotify", tags=["spotify"])

# Store tokens locally
TOKEN_CACHE_FILE = "/app/spotify_tokens.json" if os.environ.get("DOCKER_ENV") else "spotify_tokens.json"

def get_spotify_oauth(request: Request = None):
    # Always use the backend URL for the callback
    backend_url = "https://mr-jarvis.tech"
    if request and "localhost" in str(request.base_url):
        backend_url = "http://localhost:8000"
        
    redirect_uri = f"{backend_url}/api/spotify/callback"
    
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        logger.warning("Spotify credentials not set in .env")
    
    return SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        scope="user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private",
        cache_path=TOKEN_CACHE_FILE
    )

@router.get("/login")
async def login(request: Request):
    """Redirects to Spotify login"""
    sp_oauth = get_spotify_oauth(request)
    auth_url = sp_oauth.get_authorize_url()
    return RedirectResponse(auth_url)

@router.get("/callback")
async def callback(request: Request, code: str = None, error: str = None):
    """Handles Spotify OAuth callback"""
    frontend_url = settings.FRONTEND_URL
    if request and "localhost" in str(request.base_url):
        frontend_url = "http://localhost:5173"
        
    if error:
        return RedirectResponse(f"{frontend_url}/chat/spotify?error={error}")
    
    if not code:
        return RedirectResponse(f"{frontend_url}/chat/spotify?error=no_code")
        
    sp_oauth = get_spotify_oauth(request)
    try:
        token_info = sp_oauth.get_access_token(code)
        # Token is automatically cached by spotipy in cache_path
        return RedirectResponse(f"{frontend_url}/chat/spotify?success=true")
    except Exception as e:
        logger.error(f"Spotify token error: {e}")
        return RedirectResponse(f"{frontend_url}/chat/spotify?error=auth_failed")

@router.get("/status")
async def get_status():
    """Returns connection status and current playing song"""
    sp_oauth = get_spotify_oauth()
    token_info = sp_oauth.get_cached_token()
    
    if not token_info:
        return {"connected": False}
        
    try:
        sp = spotipy.Spotify(auth=token_info['access_token'])
        current = sp.current_playback()
        
        if not current or not current.get('item'):
            return {"connected": True, "playing": False}
            
        return {
            "connected": True,
            "playing": current.get('is_playing', False),
            "song": current['item'].get('name'),
            "artist": ", ".join([a['name'] for a in current['item'].get('artists', [])]),
            "image": current['item']['album']['images'][0]['url'] if current['item']['album']['images'] else None,
            "device": current.get('device', {}).get('name')
        }
    except spotipy.SpotifyException as e:
        logger.error(f"Spotify API Error: {e}")
        return {"connected": False, "error": str(e)}

def get_spotify_client():
    """Helper to get authenticated Spotify client for AI tools"""
    sp_oauth = get_spotify_oauth()
    token_info = sp_oauth.get_cached_token()
    
    if not token_info:
        raise Exception("Spotify is not connected. Please log in via the UI first.")
        
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        
    return spotipy.Spotify(auth=token_info['access_token'])
