import urllib.parse
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/tasks"
]

def get_auth_url(state: str = None) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent"
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

async def acquire_token_by_auth_code_flow(auth_code: str) -> dict:
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": auth_code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        if response.status_code != 200:
            logger.error(f"====== GOOGLE OAUTH HTTP ERROR ======")
            logger.error(f"Status: {response.status_code}")
            logger.error(f"Headers: {response.headers}")
            logger.error(f"Body: {response.text}")
            logger.error(f"=====================================")
            return {"error": "token_exchange_failed", "error_description": response.text}
        
        token_data = response.json()
        
        # Fetch user info using the new access token
        user_info = await get_user_profile(token_data.get("access_token"))
        token_data["user_profile"] = user_info
        return token_data

async def refresh_access_token(refresh_token: str) -> dict:
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        if response.status_code != 200:
            logger.error(f"Google Token Refresh Error: {response.status_code} - {response.text}")
            return {"error": "token_refresh_failed", "error_description": response.text}
        return response.json()

async def get_user_profile(access_token: str) -> dict:
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(GOOGLE_USERINFO_URL, headers=headers)
        if response.status_code == 200:
            return response.json()
        return {}
