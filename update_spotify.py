import re

# Update main.py
with open("backend/app/main.py", "r") as f:
    main = f.read()

main = main.replace("from app.api import auth, emails, calendar, todos, chat, livekit_api, notifications, bridge, pantry, github", 
                    "from app.api import auth, emails, calendar, todos, chat, livekit_api, notifications, bridge, pantry, github, spotify")
main = main.replace("app.include_router(github.router)\n", "app.include_router(github.router)\napp.include_router(spotify.router)\n")

with open("backend/app/main.py", "w") as f:
    f.write(main)

# Update graph_agent.py
with open("backend/app/agent/graph_agent.py", "r") as f:
    ga = f.read()

ga = ga.replace("from app.tools.pantry_tools import pantry_list_items, pantry_add_item, pantry_remove_item, pantry_update_quantity, pantry_find_recipe, pantry_plan_meal", 
                "from app.tools.pantry_tools import pantry_list_items, pantry_add_item, pantry_remove_item, pantry_update_quantity, pantry_find_recipe, pantry_plan_meal\nfrom app.tools.spotify_tools import spotify_play_music, spotify_pause_music, spotify_next_track, spotify_get_current_track")
ga = ga.replace("github_list_my_repositories,\n]", "github_list_my_repositories,\n    spotify_play_music,\n    spotify_pause_music,\n    spotify_next_track,\n    spotify_get_current_track,\n]")

with open("backend/app/agent/graph_agent.py", "w") as f:
    f.write(ga)

# Update livekit agent
with open("backend/livekit_agent/agent.py", "r") as f:
    la = f.read()

la = la.replace("from app.tools.pantry_tools import pantry_list_items, pantry_add_item, pantry_remove_item, pantry_update_quantity, pantry_find_recipe, pantry_plan_meal", 
                "from app.tools.pantry_tools import pantry_list_items, pantry_add_item, pantry_remove_item, pantry_update_quantity, pantry_find_recipe, pantry_plan_meal\nfrom app.tools.spotify_tools import spotify_play_music, spotify_pause_music, spotify_next_track, spotify_get_current_track")
la = la.replace("github_list_my_repositories,\n        ]", "github_list_my_repositories,\n            spotify_play_music,\n            spotify_pause_music,\n            spotify_next_track,\n            spotify_get_current_track,\n        ]")

with open("backend/livekit_agent/agent.py", "w") as f:
    f.write(la)
