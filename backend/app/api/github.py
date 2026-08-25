from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import httpx
import os
import asyncio
import re

router = APIRouter()

def get_github_headers():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN is not configured")
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

async def fetch_commit_count(client: httpx.AsyncClient, repo_full_name: str, headers: dict) -> int:
    """Fetch total commit count by checking pagination headers of per_page=1"""
    url = f"https://api.github.com/repos/{repo_full_name}/commits?per_page=1"
    try:
        response = await client.get(url, headers=headers, timeout=5.0)
        if response.status_code == 200:
            link_header = response.headers.get("Link")
            if link_header:
                # Parse rel="last" to get total pages (which equals total commits since per_page=1)
                match = re.search(r'page=(\d+)>; rel="last"', link_header)
                if match:
                    return int(match.group(1))
            # If no link header, check if we have at least 1 commit
            return len(response.json())
        return 0
    except Exception:
        return 0

@router.get("/repos", response_model=List[Dict[str, Any]])
async def get_repositories():
    """Fetch all repositories for the authenticated user"""
    url = "https://api.github.com/user/repos?sort=updated&per_page=50"
    headers = get_github_headers()
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"GitHub API Error: {response.json().get('message', 'Unknown error')}"
            )
            
        repos = response.json()
        
        # Fetch commit counts concurrently
        commit_tasks = [
            fetch_commit_count(client, repo["full_name"], headers) 
            for repo in repos
        ]
        commits_counts = await asyncio.gather(*commit_tasks)
        
        # Filter and format the data we want to send to the frontend
        formatted_repos = []
        for i, repo in enumerate(repos):
            formatted_repos.append({
                "id": repo["id"],
                "name": repo["name"],
                "full_name": repo["full_name"],
                "description": repo["description"],
                "html_url": repo["html_url"],
                "stargazers_count": repo["stargazers_count"],
                "forks_count": repo["forks_count"],
                "commits_count": commits_counts[i],
                "language": repo["language"],
                "updated_at": repo["updated_at"],
                "private": repo["private"]
            })
            
        return formatted_repos
