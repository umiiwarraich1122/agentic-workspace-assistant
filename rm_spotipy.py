with open("backend/requirements.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()
lines = [l for l in lines if "spotipy" not in l]
with open("backend/requirements.txt", "w", encoding="utf-8") as f:
    f.writelines(lines)
