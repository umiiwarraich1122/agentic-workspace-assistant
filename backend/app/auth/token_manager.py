import time
import logging
from typing import Optional
from fastapi import HTTPException
from app.services.memory_store import store
from app.auth.oauth import refresh_access_token
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class TokenManager:
    @staticmethod
    def save_user_tokens(user_id: str, token_response: dict):
        if "error" in token_response:
            logger.error(f"Error saving tokens: {token_response.get('error_description')}")
            raise ValueError(token_response.get("error_description"))
            
        token_response["acquired_at"] = time.time()
        
        # Save under primary user_id
        store.save_tokens(user_id, token_response)
        
        # Also save under email if different from user_id
        email = token_response.get("user_profile", {}).get("email")
        if email and email != user_id:
            store.save_tokens(email, token_response)
        
        # Attempt save to Supabase user_tokens table and Auth if available
        try:
            supabase = get_supabase_client()
            if supabase:
                profile = token_response.get("user_profile", {})
                email = profile.get("email")
                name = profile.get("name")
                
                # 1. Create or sync user in Supabase Auth for Dashboard visibility
                if email:
                    try:
                        # Attempt to create the user in Supabase Auth
                        supabase.auth.admin.create_user({
                            "email": email,
                            "email_confirm": True,
                            "user_metadata": {"full_name": name, "provider": "google"}
                        })
                        logger.info(f"Created user {email} in Supabase Auth")
                    except Exception as e:
                        # User likely already exists or admin API failed (non-blocking)
                        logger.debug(f"Supabase Auth sync skipped (might already exist): {e}")

                # 2. Save tokens to public.user_tokens table
                data = {
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "access_token": token_response.get("access_token"),
                    "refresh_token": token_response.get("refresh_token"),
                    "expires_in": token_response.get("expires_in"),
                    "updated_at": "now()"
                }
                supabase.table("user_tokens").upsert(data, on_conflict="user_id").execute()
                logger.info(f"Successfully synced user tokens to Supabase for {user_id}")
        except Exception as e:
            logger.warning(f"Could not sync tokens to Supabase table (non-blocking): {e}")

    @staticmethod
    async def get_access_token(user_id: str) -> str:
        tokens = store.get_tokens(user_id)
        
        # Fallback 1: Search in-memory store for matching email or token entry
        if not tokens and hasattr(store, "_user_tokens"):
            for k, val in store._user_tokens.items():
                if isinstance(val, dict):
                    p = val.get("user_profile", {})
                    if p.get("email") == user_id or p.get("id") == user_id:
                        tokens = val
                        break
        
        # Fallback 2: Search Supabase if available
        if not tokens:
            try:
                supabase = get_supabase_client()
                if supabase:
                    res = supabase.table("user_tokens").select("*").or_(f"user_id.eq.{user_id},email.eq.{user_id}").execute()
                    if res.data and len(res.data) > 0:
                        tokens = res.data[0]
                        store.save_tokens(user_id, tokens)
            except Exception as e:
                logger.warning(f"Error fetching tokens from Supabase: {e}")

        if not tokens:
            raise HTTPException(status_code=401, detail="User not authenticated. Please log in with Google again.")
        
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        
        # Parse acquired_at (might be missing in Supabase, fallback to 0 or use updated_at if needed)
        acquired_at = tokens.get("acquired_at")
        if acquired_at is None:
            acquired_at = 0
            
        expires_in = tokens.get("expires_in")
        if expires_in is None:
            expires_in = 3600
        
        # Check if token is near expiration (within 60 seconds of expiry)
        is_expired = False
        if acquired_at > 0:
            if time.time() > (acquired_at + expires_in - 60):
                is_expired = True

        if is_expired and refresh_token:
            logger.info(f"Google access token expired for user {user_id}. Refreshing...")
            new_tokens = await refresh_access_token(refresh_token)
            if new_tokens and "access_token" in new_tokens:
                tokens["access_token"] = new_tokens["access_token"]
                tokens["acquired_at"] = time.time()
                if "refresh_token" in new_tokens:
                    tokens["refresh_token"] = new_tokens["refresh_token"]
                store.save_tokens(user_id, tokens)
                return tokens["access_token"]
            else:
                logger.error(f"Failed to refresh Google token for user {user_id}")

        if not access_token:
            raise HTTPException(status_code=401, detail="No valid access token found. Please log in again.")
        return access_token

    @staticmethod
    def get_user_id_from_tokens(token_response: dict) -> str:
        profile = token_response.get("user_profile", {})
        user_id = profile.get("id") or profile.get("email")
        if not user_id:
            user_id = "default_google_user"
        return user_id
