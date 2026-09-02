with open("frontend/src/pages/CommandCenter.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("Spotify", "YouTube Music")
text = text.replace("/chat/spotify", "/chat/youtube")

with open("frontend/src/pages/CommandCenter.tsx", "w", encoding="utf-8") as f:
    f.write(text)
