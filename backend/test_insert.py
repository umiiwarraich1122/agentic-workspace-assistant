import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database.supabase import get_supabase

def test_insert():
    supabase = get_supabase()
    try:
        supabase.table("conversations").insert({
            "thread_id": "test_thread",
            "user_id": "117584337306061482102",
            "role": "user",
            "content": "test message"
        }).execute()
        print("Insert succeeded!")
    except Exception as e:
        print("Insert failed:", repr(e))

test_insert()
