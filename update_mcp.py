import re

with open('backend/github_mcp.py', 'r') as f:
    content = f.read()

helper = '''
def get_authenticated_user():
    response = requests.get("https://api.github.com/user", headers=get_headers())
    if response.status_code == 200:
        return response.json().get("login")
    raise ValueError("Failed to get authenticated user")
'''

content = content.replace('def get_headers():', helper + '\ndef get_headers():')

content = content.replace('def get_repository_info(owner: str, repo: str) -> str:', 'def get_repository_info(repo: str, owner: str = \"\") -> str:\n    if not owner:\n        owner = get_authenticated_user()')
content = content.replace('def get_recent_commits(owner: str, repo: str, limit: int = 5) -> str:', 'def get_recent_commits(repo: str, owner: str = \"\", limit: int = 5) -> str:\n    if not owner:\n        owner = get_authenticated_user()')
content = content.replace('def get_total_commits(owner: str, repo: str) -> str:', 'def get_total_commits(repo: str, owner: str = \"\") -> str:\n    if not owner:\n        owner = get_authenticated_user()')

with open('backend/github_mcp.py', 'w') as f:
    f.write(content)
