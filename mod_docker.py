import os

for filename in ["docker-compose.yml", "docker-compose.prod.yml"]:
    with open(filename, "r", encoding="utf-8") as f:
        text = f.read()

    # Add volume mapping to backend-api
    text = text.replace(
        "- jarvis_tokens:/app/tokens_db.json\n",
        "- jarvis_tokens:/app/tokens_db.json\n      - shared_data:/app/shared\n"
    )

    # Add shared_data to volumes at the end
    text = text.replace(
        "  jarvis_tokens:\n",
        "  jarvis_tokens:\n  shared_data:\n"
    )

    with open(filename, "w", encoding="utf-8") as f:
        f.write(text)
