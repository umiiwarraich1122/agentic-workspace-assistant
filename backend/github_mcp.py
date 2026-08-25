import os
import requests
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# 1. Initialize the MCP Server
mcp = FastMCP("GitHub Server")

# 2. Helper function to get authentication headers
def get_headers():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise ValueError("GITHUB_TOKEN environment variable is missing! Please add it to your .env file.")
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MR-JARVIS-MCP"
    }

# 3. Define our first tool: Get Repository Info
@mcp.tool()
def get_repository_info(owner: str, repo: str) -> str:
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

# 4. Define our second tool: Get Recent Commits
@mcp.tool()
def get_recent_commits(owner: str, repo: str, limit: int = 5) -> str:
    """Fetch the most recent commits for a GitHub repository."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page={limit}"
    response = requests.get(url, headers=get_headers())
    
    if response.status_code != 200:
        return f"Error: {response.json().get('message', 'Unknown error')}"
        
    commits = response.json()
    result = f"Recent Commits for {owner}/{repo}:\n\n"
    for commit in commits:
        sha = commit['sha'][:7] # Short commit hash
        author = commit['commit']['author']['name']
        message = commit['commit']['message'].split('\n')[0] # Only take the first line of the commit message
        date = commit['commit']['author']['date']
        result += f"- [{sha}] {date} by {author}: {message}\n"
        
    return result

if __name__ == "__main__":
    # 5. Run the server using Standard Input/Output (stdio)
    mcp.run()
