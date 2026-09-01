with open("backend/app/tools/spotify_tools.py", "a") as f:
    f.write("\ndef get_spotify_tools():\n    return [spotify_play_music, spotify_pause_music, spotify_next_track, spotify_get_current_track]\n")

import re

# Update graph_agent.py
with open("backend/app/agent/graph_agent.py", "r") as f:
    ga = f.read()

ga = ga.replace("from app.tools.github_tools import get_github_mcp_tools", 
                "from app.tools.github_tools import get_github_mcp_tools\nfrom app.tools.spotify_tools import get_spotify_tools")
ga = ga.replace("*get_github_mcp_tools()", "*get_github_mcp_tools(),\n        *get_spotify_tools()")

with open("backend/app/agent/graph_agent.py", "w") as f:
    f.write(ga)

# Update livekit agent
with open("backend/livekit_agent/agent.py", "r") as f:
    la = f.read()

la = la.replace("from app.tools.github_tools import get_github_mcp_tools", 
                "from app.tools.github_tools import get_github_mcp_tools\nfrom app.tools.spotify_tools import get_spotify_tools")
la = la.replace("*get_github_mcp_tools()", "*get_github_mcp_tools(),\n            *get_spotify_tools()")

with open("backend/livekit_agent/agent.py", "w") as f:
    f.write(la)
