import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database.supabase import get_supabase

def test_db():
    supabase = get_supabase()
    try:
        res = supabase.table("user_tokens").select("*").execute()
        print("user_tokens table exists. Row count:", len(res.data))
    except Exception as e:
        print("Error:", e)

test_db()
