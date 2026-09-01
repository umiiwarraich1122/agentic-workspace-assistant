import re

filepath = "backend/app/tools/github_tools.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make repo optional and update docstrings and error handling

# github_get_repository_info
content = content.replace(
    'def github_get_repository_info(repo: str, owner: str = "") -> str:',
    'def github_get_repository_info(repo: str = "", owner: str = "") -> str:'
)
content = content.replace(
    '"""Use this to fetch basic information about a GitHub repository (stars, forks, open issues)."""\n    return asyncio.run',
    '"""Use this to fetch basic information about a GitHub repository (stars, forks, open issues). If the user doesn\'t specify a repo, DO NOT ask them for it. Call github_list_my_repositories first to find it."""\n    if not repo:\n        return "Error: You must specify a repository. Call github_list_my_repositories to see available repositories and pick one."\n    return asyncio.run'
)

# github_get_recent_commits
content = content.replace(
    'def github_get_recent_commits(repo: str, owner: str = "", limit: int = 5) -> str:',
    'def github_get_recent_commits(repo: str = "", owner: str = "", limit: int = 5) -> str:'
)
content = content.replace(
    '"""Use this to fetch the most recent commits for a GitHub repository to track progress."""\n    return asyncio.run',
    '"""Use this to fetch the most recent commits for a GitHub repository to track progress. If the user doesn\'t specify a repo, DO NOT ask them for it. Call github_list_my_repositories first to find it."""\n    if not repo:\n        return "Error: You must specify a repository. Call github_list_my_repositories to see available repositories and pick one."\n    return asyncio.run'
)

# github_get_total_commits
content = content.replace(
    'def github_get_total_commits(repo: str, owner: str = "") -> str:',
    'def github_get_total_commits(repo: str = "", owner: str = "") -> str:'
)
content = content.replace(
    '"""Use this to get the total number of commits for a specific repository."""\n    return asyncio.run',
    '"""Use this to get the total number of commits for a specific repository. If the user doesn\'t specify a repo, DO NOT ask them for it. Call github_list_my_repositories first to find it."""\n    if not repo:\n        return "Error: You must specify a repository. Call github_list_my_repositories to see available repositories and pick one."\n    return asyncio.run'
)

# github_list_my_repositories
content = content.replace(
    '"""Use this to list the authenticated user\'s repositories. Helpful for \'how many repos are there\' or \'which is my best project\'."""',
    '"""Use this to list the authenticated user\'s repositories. Helpful for \'how many repos are there\' or \'which is my best project\'. IF THE USER DOES NOT SPECIFY A REPO, ALWAYS CALL THIS TOOL FIRST instead of asking them."""'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
