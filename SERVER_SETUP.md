# MR Jarvis — First-Time Server Setup Guide

Run these commands on your Ubuntu 24.04 server **one time only**.
After setup is complete, use ash deploy.sh for all future deployments.

---

## Step 1: Connect to your server

`ash
ssh root@YOUR_SERVER_IP
`

---

## Step 2: System setup

`ash
apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
`

---

## Step 3: Install Docker

`ash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
`

---

## Step 4: Create deployment user (optional but recommended)

`ash
adduser jarvis
usermod -aG sudo jarvis
usermod -aG docker jarvis
# Copy SSH keys so you can SSH as jarvis:
rsync --archive --chown=jarvis:jarvis ~/.ssh /home/jarvis
`

---

## Step 5: Clone the project

`ash
su - jarvis   # (or stay as root)
cd ~
git clone https://github.com/umiiwarraich1122/agentic-workspace-assistant.git mr-jarvis
cd mr-jarvis
`

---

## Step 6: Create the backend .env file

`ash
nano backend/.env
`

Paste your full .env content (same as your local backend/.env) and save.

> IMPORTANT: Make sure GOOGLE_REDIRECT_URI=https://mr-jarvis.tech/auth/callback

---

## Step 7: Set up Nginx

`ash
# Copy the Nginx config from the repo
sudo cp nginx/mr-jarvis.conf /etc/nginx/sites-available/mr-jarvis
sudo ln -s /etc/nginx/sites-available/mr-jarvis /etc/nginx/sites-enabled/

# Remove the default Nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config (will warn about missing SSL certs — that's OK for now)
sudo nginx -t || true
sudo systemctl reload nginx
`

---

## Step 8: Get SSL certificate (HTTPS)

Make sure your domain DNS is pointing to this server first!

`ash
sudo certbot --nginx -d mr-jarvis.tech -d www.mr-jarvis.tech
`

Follow the prompts. Certbot will:
- Issue your certificate
- Automatically edit the Nginx config with SSL settings
- Set up auto-renewal

Verify auto-renewal:
`ash
sudo certbot renew --dry-run
`

---

## Step 9: Deploy the application

`ash
cd ~/mr-jarvis
bash deploy.sh
`

This will build all Docker containers and start them.

---

## Step 10: Verify everything is running

`ash
# Check containers
docker compose -f docker-compose.prod.yml ps

# Check API health
curl https://mr-jarvis.tech/health

# Check logs if needed
docker logs mr-jarvis-api
docker logs mr-jarvis-livekit
docker logs mr-jarvis-frontend
`

---

## Useful Commands

| Command | Purpose |
| :--- | :--- |
| ash deploy.sh | Deploy latest code (git pull + rebuild) |
| docker compose -f docker-compose.prod.yml ps | Check container status |
| docker logs mr-jarvis-api -f | Tail API logs |
| docker logs mr-jarvis-livekit -f | Tail voice agent logs |
| docker compose -f docker-compose.prod.yml down | Stop everything |
| docker compose -f docker-compose.prod.yml restart backend-api | Restart single service |

---

## IMPORTANT: Google Cloud Console Update

After deploying, go to:
**Google Cloud Console** ? APIs & Services ? Credentials ? OAuth 2.0 Client IDs

Add this to **Authorized redirect URIs**:
`
https://mr-jarvis.tech/auth/callback
`

And add this to **Authorized JavaScript origins**:
`
https://mr-jarvis.tech
`

Without this, Google login will fail!
