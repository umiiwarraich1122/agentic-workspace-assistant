import os
import requests
import re
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# 1. Initialize the MCP Server
mcp = FastMCP("GitHub Server")

# 2. Helper function to get authentication headers

def get_authenticated_user():
    response = requests.get("https://api.github.com/user", headers=get_headers())
    if response.status_code == 200:
        return response.json().get("login")
    raise ValueError("Failed to get authenticated user")

def get_headers():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise ValueError("GITHUB_TOKEN environment variable is missing! Please add it to your .env file.")
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MR-JARVIS-MCP"
    }

@mcp.tool()
def get_repository_info(repo: str, owner: str = "") -> str:
    if '/' in repo:
        parts = repo.split('/')
        owner = parts[0]
        repo = parts[1]
    if not owner:
        owner = get_authenticated_user()
    """Fetch basic information about a GitHub repository (stars, forks, open issues)."""
    url = f"https://api.github.com/repos/{owner}/{repo}"
    response = requests.get(url, headers=get_headers())
    
    if response.status_code != 200:
        return f"Error: {response.json().get('message', 'Unknown error')}"
        
    data = response.json()
    return (
        f"Repository: {data['full_name']}\n"
        f"Description: {data.get('description', 'No description')}\n"
        f"Stars: {data['stargazers_count']}\n"
        f"Forks: {data['forks_count']}\n"
        f"Open Issues: {data['open_issues_count']}\n"
        f"Language: {data.get('language', 'Unknown')}"
    )

@mcp.tool()
def get_recent_commits(repo: str, owner: str = "", limit: int = 5) -> str:
    if '/' in repo:
        parts = repo.split('/')
        owner = parts[0]
        repo = parts[1]
    if not owner:
        owner = get_authenticated_user()
    """Fetch the most recent commits for a GitHub repository."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page={limit}"
    response = requests.get(url, headers=get_headers())
    
    if response.status_code != 200:
        return f"Error: {response.json().get('message', 'Unknown error')}"
        
    commits = response.json()
    result = f"Recent Commits for {owner}/{repo}:\n\n"
    for commit in commits:
        sha = commit['sha'][:7]
        author = commit['commit']['author']['name']
        message = commit['commit']['message'].split('\n')[0]
        date = commit['commit']['author']['date']
        result += f"- [{sha}] {date} by {author}: {message}\n"
        
    return result

@mcp.tool()
def list_my_repositories(limit: int = 50) -> str:
    """List the authenticated user's repositories. Helpful for answering 'how many repos are there' or 'which is my best project'."""
    url = f"https://api.github.com/user/repos?sort=updated&per_page={limit}"
    response = requests.get(url, headers=get_headers())
    
    if response.status_code != 200:
        return f"Error: {response.json().get('message', 'Unknown error')}"
        
    repos = response.json()
    result = f"You have {len(repos)} repositories (showing up to {limit}):\n\n"
    for r in repos:
        result += f"- {r['full_name']} | Stars: {r['stargazers_count']} | Language: {r.get('language', 'N/A')}\n"
        if r.get('description'):
            result += f"  Summary: {r['description']}\n"
    return result

@mcp.tool()
def get_total_commits(repo: str, owner: str = "") -> str:
    if '/' in repo:
        parts = repo.split('/')
        owner = parts[0]
        repo = parts[1]
    if not owner:
        owner = get_authenticated_user()
    """Get the total number of commits for a specific repository. Helpful for 'how many commits on a specific project'."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
    response = requests.get(url, headers=get_headers())
    
    if response.status_code != 200:
        return f"Error: {response.json().get('message', 'Unknown error')}"
        
    link_header = response.headers.get("Link")
    if link_header:
        match = re.search(r'page=(\d+)>; rel="last"', link_header)
        if match:
            return f"The repository {owner}/{repo} has {match.group(1)} total commits."
            
    commits = response.json()
    return f"The repository {owner}/{repo} has {len(commits)} total commits."

if __name__ == "__main__":
    mcp.run()
