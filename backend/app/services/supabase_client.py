import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                from supabase import create_client
                _supabase_client = create_client(url, key)
                logger.info("Supabase client successfully initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
        else:
            logger.warning("Supabase URL or Key not set in environment.")
    return _supabase_client
