import codecs

# Fix requirements.txt
with open("backend/requirements.txt", "rb") as f:
    content = f.read()

# Try to decode and clean
text = content.decode('utf-8', errors='ignore')
text = text.replace('\x00', '')

# Extract unique lines
lines = [line.strip() for line in text.split('\n') if line.strip()]

# Remove corrupted lines
lines = [line for line in lines if "s p o t" not in line]

if "spotipy==2.24.0" not in lines:
    lines.append("spotipy==2.24.0")

with open("backend/requirements.txt", "w", encoding="utf-8") as f:
    f.write('\n'.join(lines) + '\n')
