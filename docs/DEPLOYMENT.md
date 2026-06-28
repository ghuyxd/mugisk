# Deployment Guide

This guide explains how to deploy the Mugisk server to a public Virtual Private Server (VPS) and connect your Electron desktop client to it. Docker Compose is the recommended way to self-host Mugisk.

## Prerequisites
- A VPS (e.g., DigitalOcean, Linode, Hetzner) running Linux (Ubuntu 22.04+ recommended).
- A domain name pointing to your VPS's IP address (e.g., `music.yourdomain.com`).
- Docker and Docker Compose installed on the server.
- Your music library uploaded to the server (e.g., `/mnt/volume_music`).

---

## 1. Firewall Configuration (Open Ports)
Ensure the following ports are open on your VPS firewall:
- **80** (HTTP, for Let's Encrypt validation and redirection to HTTPS)
- **443** (HTTPS, for secure API communication)
- **22** (SSH, for server management)

Using `ufw` on Ubuntu:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## 2. Server Setup

### Clone Repository & Configure Environment
```bash
git clone https://github.com/your-org/mugisk.git /opt/mugisk
cd /opt/mugisk
cp .env.example .env
```

### Environment Variable Checklist
Edit your `.env` file and securely set the following variables:
- `POSTGRES_PASSWORD`: A secure password for the database.
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Generate long, random hex strings.
- `MUSIC_LIBRARY_PATH`: Ensure this points to the absolute path of your music directory on the host machine.
- `ADMIN_EMAIL` & `ADMIN_PASSWORD`: Credentials for your first admin account.

#### 🤖 AI Configuration (Optional)
If you want Mugisk to auto-tag your music and generate smart playlists:
- `AI_API_KEY`: Your Anthropic, OpenAI, or DeepSeek API key.
- `AI_BASE_URL`: The API base URL (e.g., `https://api.openai.com/v1`).
- `AI_MODEL`: The specific model to use (e.g., `gpt-4o-mini`).
- `AI_FEATURE_ENABLED`: Set to `"true"`. You can toggle this dynamically from the Admin Panel later.

### Start the Server
```bash
docker compose up --build -d
```
This will bring up the PostgreSQL database and the Next.js server. Prisma migrations and the admin seed script will run automatically.

---

## 3. Reverse Proxy & HTTPS Setup

To use Mugisk securely over the internet, put it behind a reverse proxy with HTTPS enabled.

### Option A: Using Caddy (Recommended)
Caddy automatically handles HTTPS certificates via Let's Encrypt.
1. Install Caddy on your VPS.
2. Edit `/etc/caddy/Caddyfile`:
```caddyfile
music.yourdomain.com {
    reverse_proxy localhost:3000
}
```
3. Restart Caddy: `sudo systemctl restart caddy`.

### Option B: Using Nginx
1. Install Nginx and Certbot: `sudo apt install nginx certbot python3-certbot-nginx`
2. Create an Nginx server block `/etc/nginx/sites-available/mugisk`:
```nginx
server {
    server_name music.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
3. Enable and secure:
```bash
sudo ln -s /etc/nginx/sites-available/mugisk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d music.yourdomain.com
```

---

## 4. Connecting the Desktop Client

Once your server is accessible at `https://music.yourdomain.com`:
1. Open the Mugisk desktop app.
2. On the login screen, locate the **Server URL** input field at the bottom.
3. Change it from `http://localhost:3000` to `https://music.yourdomain.com`.
4. Log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in the `.env` file.

You're done! All streaming, library operations, and AI generation will now route securely through your server. 

> **Tip:** You can access the Admin Dashboard by opening `https://music.yourdomain.com/admin/settings` in any web browser to manage your library and toggle AI features.
