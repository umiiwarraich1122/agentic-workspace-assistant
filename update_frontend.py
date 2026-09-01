import re

with open("frontend/src/pages/CommandCenter.tsx", "r") as f:
    cc = f.read()

spotify_btn = """            <button 
              onClick={() => navigate('/chat/spotify')}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-cyan-900/40 transition-colors text-sm font-mono text-cyan-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><circle cx="12" cy="12" r="10"></circle><path d="M8 11.973c2.5-1.473 5.5-.973 7.5.527"></path><path d="M9 15c1.5-1 4-1 5 .5"></path><path d="M7 9c2-1 6-2 10 .5"></path></svg>
              Spotify
            </button>
"""

# Insert after GitHub button
github_btn = """<GitBranch className="w-4 h-4 text-cyan-400" />
              GitHub
            </button>"""

cc = cc.replace(github_btn, github_btn + "\n" + spotify_btn)

with open("frontend/src/pages/CommandCenter.tsx", "w") as f:
    f.write(cc)

with open("frontend/src/App.tsx", "r") as f:
    app = f.read()

app = app.replace("import { GitHubModule } from './pages/GitHubModule';", "import { GitHubModule } from './pages/GitHubModule';\nimport { SpotifyModule } from './pages/SpotifyModule';")
app = app.replace("<Route path=\"github\" element={<GitHubModule />} />", "<Route path=\"github\" element={<GitHubModule />} />\n              <Route path=\"spotify\" element={<SpotifyModule />} />")

with open("frontend/src/App.tsx", "w") as f:
    f.write(app)
