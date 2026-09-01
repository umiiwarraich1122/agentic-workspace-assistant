with open('backend/app/tools/github_tools.py', 'r') as f:
    content = f.read()

content = content.replace('def github_get_repository_info(owner: str, repo: str) -> str:', 'def github_get_repository_info(repo: str, owner: str = \"\") -> str:')
content = content.replace('def github_get_recent_commits(owner: str, repo: str, limit: int = 5) -> str:', 'def github_get_recent_commits(repo: str, owner: str = \"\", limit: int = 5) -> str:')
content = content.replace('def github_get_total_commits(owner: str, repo: str) -> str:', 'def github_get_total_commits(repo: str, owner: str = \"\") -> str:')

with open('backend/app/tools/github_tools.py', 'w') as f:
    f.write(content)
