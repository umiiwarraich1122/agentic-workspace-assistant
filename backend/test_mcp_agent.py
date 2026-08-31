import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.tools.github_tools import github_list_my_repositories

print("Repos:", github_list_my_repositories.invoke({"limit": 5}))
