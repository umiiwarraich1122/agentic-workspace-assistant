import requests
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

def get_headers():
    token = os.environ.get("GITHUB_TOKEN")
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MR-JARVIS-MCP"
    }

url = "https://api.github.com/repos/umiiwarraich1122/umiiwarraich1122/agentic-workspace-assistant/commits?per_page=1"
res = requests.get(url, headers=get_headers())
print(res.status_code)
print(res.json())
