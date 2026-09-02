with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("import { SpotifyModule } from './pages/SpotifyModule';", "import { YoutubeModule } from './pages/YoutubeModule';")
text = text.replace("<Route path=\"spotify\" element={<SpotifyModule />} />", "<Route path=\"youtube\" element={<YoutubeModule />} />")

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(text)
