import requests
import json
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

url = "https://yyvxaosvfvyiombipuey.supabase.co/rest/v1/conversations?select=role,content,created_at&thread_id=eq.49db5cea-e656-4d8e-a2de-ec10cebc870c&order=created_at.asc"
headers = {
    "apikey": os.environ["SUPABASE_ANON_KEY"],
    "Authorization": f"Bearer {os.environ['SUPABASE_ANON_KEY']}"
}

res = requests.get(url, headers=headers)
print(json.dumps(res.json(), indent=2))
