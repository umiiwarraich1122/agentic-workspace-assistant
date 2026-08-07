import logging
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from app.auth.oauth import get_auth_url, acquire_token_by_auth_code_flow
from app.auth.token_manager import TokenManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/login")
async def login():
    """Redirects the user to Google OAuth 2.0 login page."""
    auth_url = get_auth_url()
    return RedirectResponse(auth_url)

@router.get("/callback")
async def auth_callback(request: Request):
    """Handles the Google OAuth callback, acquires tokens, saves user session, and redirects to frontend."""
    code = request.query_params.get("code")
    error = request.query_params.get("error")
    
    # Detect frontend base URL from config, optionally override if local referer (for dev)
    from app.config import settings
    frontend_base = settings.FRONTEND_URL
    referer = request.headers.get("referer", "")
    if referer and "localhost" in referer:
        parsed = urllib.parse.urlparse(referer)
        frontend_base = f"{parsed.scheme}://{parsed.netloc}"
        
    if error or not code:
        logger.error(f"Google OAuth Callback Error or Missing Code: error={error}, code={bool(code)}")
        return RedirectResponse(f"{frontend_base}/?error={error or 'no_code'}")

    result = await acquire_token_by_auth_code_flow(code)
    
    if "error" in result:
        logger.error(f"Token Exchange Error: {result}")
        err_msg = result.get("error_description", result.get("error", "OAuth failed"))
        return RedirectResponse(f"{frontend_base}/?error={err_msg}")

    user_id = TokenManager.get_user_id_from_tokens(result)
    TokenManager.save_user_tokens(user_id, result)
    
    profile = result.get("user_profile", {})
    name = profile.get("name") or profile.get("email") or "User"

    # Redirect back to the frontend with user_id and name
    return RedirectResponse(f"{frontend_base}/login/success?user_id={user_id}&name={urllib.parse.quote(name)}")
