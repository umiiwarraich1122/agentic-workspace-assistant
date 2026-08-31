import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.tools.github_tools import github_get_total_commits

print("Commits:", github_get_total_commits.invoke({"repo": "agentic-workspace-assistant"}))
