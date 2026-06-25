# Deployment Guide

This guide explains how to deploy the Mugisk server to a public Virtual Private Server (VPS) and connect your Electron desktop client to it.

## Prerequisites
- A VPS (e.g., DigitalOcean, Linode, Hetzner) running Linux (Ubuntu 22.04+ recommended).
- A domain name pointing to your VPS's IP address (e.g., `music.yourdomain.com`).
- Docker and Docker Compose installed on the server.
- Your music library uploaded to the server.

## 1. Firewall Configuration (Open Ports)
Ensure the following ports are open on your VPS firewall:
- **80** (HTTP, for Let's Encrypt validation and redirection to HTTPS)
- **443** (HTTPS, for secure API communication)
- **3000** (Optional, if you want to bypass the proxy, though it's recommended to keep it internal only)
- **22** (SSH, for server management)

Using `ufw` on Ubuntu:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## 2. Server Setup

### Clone Repository & Configure Environment
```bash
git clone https://github.com/your-org/mugisk.git /opt/mugisk
cd /opt/mugisk
cp .env.example .env
```

### Environment Variable Checklist
Edit your `.env` file and set the following production-critical variables:
- `POSTGRES_PASSWORD`: Change this from the default.
- `JWT_SECRET`: Generate a long, random string.
- `JWT_REFRESH_SECRET`: Generate another long, random string.
- `MUSIC_LIBRARY_PATH`: Ensure this points to the absolute path of your music directory on the VPS (e.g., `/mnt/volume_music`).
- `AI_API_KEY`: Set this if you wish to use the Anthropic/OpenAI integration for auto-tagging.

### Start the Server
```bash
docker compose up --build -d
```
This will bring up the PostgreSQL database and the Next.js server. Migrations will run automatically.

## 3. Reverse Proxy & HTTPS Setup

It is highly recommended to put Mugisk behind a reverse proxy with HTTPS enabled.

### Option A: Using Caddy (Recommended)
Caddy automatically handles HTTPS certificates via Let's Encrypt.
1. Install Caddy (`sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https && ...` per Caddy docs).
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

## 4. Connecting the Electron Client

Once your server is accessible at `https://music.yourdomain.com`, you need to configure the Electron client to use it.
1. Open the Mugisk desktop app.
2. In the login screen (or settings), locate the **Server URL** input field.
3. Change it from `http://localhost:3000` to `https://music.yourdomain.com`.
4. Log in with your admin credentials.

All streaming, library operations, and API calls will now route securely through your public domain.
