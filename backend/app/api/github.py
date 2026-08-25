from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import requests
import os

router = APIRouter()

def get_github_headers():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN is not configured")
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

@router.get("/repos", response_model=List[Dict[str, Any]])
async def get_repositories():
    """Fetch all repositories for the authenticated user"""
    url = "https://api.github.com/user/repos?sort=updated&per_page=50"
    
    response = requests.get(url, headers=get_github_headers())
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code, 
            detail=f"GitHub API Error: {response.json().get('message', 'Unknown error')}"
        )
        
    repos = response.json()
    
    # Filter and format the data we want to send to the frontend
    formatted_repos = []
    for repo in repos:
        formatted_repos.append({
            "id": repo["id"],
            "name": repo["name"],
            "full_name": repo["full_name"],
            "description": repo["description"],
            "html_url": repo["html_url"],
            "stargazers_count": repo["stargazers_count"],
            "forks_count": repo["forks_count"],
            "language": repo["language"],
            "updated_at": repo["updated_at"],
            "private": repo["private"]
        })
        
    return formatted_repos
