with open("backend/app/main.py", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("pantry, github, spotify", "pantry, github, youtube")
text = text.replace("app.include_router(spotify.router)", "app.include_router(youtube.router)")

with open("backend/app/main.py", "w", encoding="utf-8") as f:
    f.write(text)
