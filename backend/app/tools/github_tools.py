import asyncio
import os
from langchain_core.tools import tool
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession

# Find the absolute path to the github_mcp.py script
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
mcp_script = os.path.join(backend_dir, "github_mcp.py")

# Define how to connect to our local MCP server
server_params = StdioServerParameters(
    command="python",
    args=[mcp_script]
)

async def _call_mcp_tool(tool_name: str, arguments: dict) -> str:
    """Async helper to connect to MCP, call the tool, and close connection."""
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # Call the specific tool on the MCP server
            result = await session.call_tool(tool_name, arguments)
            
            # Extract and return the text content from the MCP response
            return result.content[0].text if result.content else "No response"

@tool
def github_get_repository_info(repo: str = "", owner: str = "") -> str:
    """Use this to fetch basic information about a GitHub repository (stars, forks, open issues). If the user doesn't specify a repo, DO NOT ask them for it. Call github_list_my_repositories first to find it."""
    if not repo:
        return "Error: You must specify a repository. Call github_list_my_repositories to see available repositories and pick one."
    return asyncio.run(_call_mcp_tool("get_repository_info", {"owner": owner, "repo": repo}))

@tool
def github_get_recent_commits(repo: str = "", owner: str = "", limit: int = 5) -> str:
    """Use this to fetch the most recent commits for a GitHub repository to track progress. If the user doesn't specify a repo, DO NOT ask them for it. Call github_list_my_repositories first to find it."""
    if not repo:
        return "Error: You must specify a repository. Call github_list_my_repositories to see available repositories and pick one."
    return asyncio.run(_call_mcp_tool("get_recent_commits", {"owner": owner, "repo": repo, "limit": limit}))

@tool
def github_list_my_repositories(limit: int = 50) -> str:
    """Use this to list the authenticated user's repositories. Helpful for 'how many repos are there' or 'which is my best project'. IF THE USER DOES NOT SPECIFY A REPO, ALWAYS CALL THIS TOOL FIRST instead of asking them."""
    return asyncio.run(_call_mcp_tool("list_my_repositories", {"limit": limit}))

@tool
def github_get_total_commits(repo: str = "", owner: str = "") -> str:
    """Use this to get the total number of commits for a specific repository. If the user doesn't specify a repo, DO NOT ask them for it. Call github_list_my_repositories first to find it."""
    if not repo:
        return "Error: You must specify a repository. Call github_list_my_repositories to see available repositories and pick one."
    return asyncio.run(_call_mcp_tool("get_total_commits", {"owner": owner, "repo": repo}))

def get_github_mcp_tools():
    """Returns the list of GitHub MCP tools for the LangGraph agent."""
    return [
        github_get_repository_info, 
        github_get_recent_commits, 
        github_list_my_repositories, 
        github_get_total_commits
    ]
