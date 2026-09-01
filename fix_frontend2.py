import re

# Fix App.tsx
with open("frontend/src/App.tsx", "r") as f:
    app = f.read()

app = app.replace("import { GithubModule } from './pages/GithubModule';", "import { GithubModule } from './pages/GithubModule';\nimport { SpotifyModule } from './pages/SpotifyModule';")
app = app.replace('<Route path="github" element={<GithubModule />} />', '<Route path="github" element={<GithubModule />} />\n              <Route path="spotify" element={<SpotifyModule />} />')

with open("frontend/src/App.tsx", "w") as f:
    f.write(app)

# Fix CommandCenter.tsx
with open("frontend/src/pages/CommandCenter.tsx", "r") as f:
    cc = f.read()

# We need to find the GitHub button and add Spotify after it.
# The GitHub button in CommandCenter uses GitBranch icon.
# Let's just insert it before the last </div> in the nav section.

spotify_btn = """
            <button 
              onClick={() => navigate('/chat/spotify')}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-cyan-900/40 transition-colors text-sm font-mono text-cyan-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><circle cx="12" cy="12" r="10"></circle><path d="M8 11.973c2.5-1.473 5.5-.973 7.5.527"></path><path d="M9 15c1.5-1 4-1 5 .5"></path><path d="M7 9c2-1 6-2 10 .5"></path></svg>
              Spotify
            </button>
"""

# Find the Github button
github_btn = """<GitBranch className="w-4 h-4 text-cyan-400" />
              GitHub
            </button>"""

if github_btn in cc:
    cc = cc.replace(github_btn, github_btn + spotify_btn)
else:
    # Fallback: Just insert it before closing </div> of that section
    # Search for Github button using regex
    cc = re.sub(r'(<GitBranch.*?GitHub\s*</button>)', r'\1' + spotify_btn, cc, flags=re.DOTALL)

with open("frontend/src/pages/CommandCenter.tsx", "w") as f:
    f.write(cc)
