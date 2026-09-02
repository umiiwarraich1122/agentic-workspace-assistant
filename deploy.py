import os
import subprocess

ssh_cmd = [
    "ssh",
    "-i", r"C:\Users\umiiw\Downloads\RSA.pem",
    "-o", "StrictHostKeyChecking=no",
    "ubuntu@16.170.169.217",
    "cd ~/mr-jarvis && echo YOUTUBE_API_KEY=AIzaSyAhWKuzs3pGQ5BESX_7pU_Lb9TeNr7S-7I >> backend/.env && git pull && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d --build"
]

subprocess.run(ssh_cmd)
