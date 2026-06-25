# Mugisk Deployment Guide

This guide covers how to deploy the Mugisk backend (server) on a public Virtual Private Server (VPS) so that the Electron client can connect to it securely.

## 1. Prerequisites

- A Linux VPS (Ubuntu 22.04 or 24.04 recommended)
- A domain name pointing to your VPS (e.g., `mugisk.yourdomain.com`)
- Docker and Docker Compose installed on the server
- Git installed on the server

## 2. Environment Variables

Clone the repository on your server and navigate into the `mugisk` folder:

```bash
git clone https://github.com/yourusername/mugisk.git
cd mugisk
```

Copy the example environment file:

```bash
cp .env.example .env
```

Edit the `.env` file and set the following values:

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | A strong password for the PostgreSQL database. |
| `JWT_SECRET` | A long, random string for signing access tokens. (e.g., `openssl rand -base64 32`) |
| `JWT_REFRESH_SECRET` | A long, random string for signing refresh tokens. |
| `MUSIC_LIBRARY_PATH` | The absolute path on your host machine where your music is stored. e.g., `/home/user/music` |
| `AI_API_KEY` | (Optional) Your Gemini AI API key for the AI-assisted playlists and recommendations. |

## 3. Starting the Server

The project uses a multi-stage Docker build to package the Next.js server along with the Prisma database client.

Start the application with Docker Compose:

```bash
docker compose up -d --build
```

This command will:
1. Start the PostgreSQL database
2. Build the Next.js server image
3. Start the Next.js server
4. Automatically run database migrations and seed default data (e.g. creating the admin user)

**Important:** The Next.js server runs on port `3000` internally, which is exposed to `localhost:3000` by Docker Compose. We will use a reverse proxy to expose it securely.

## 4. Reverse Proxy & HTTPS (Caddy)

We strongly recommend using **Caddy** as it automatically provisions and renews SSL/TLS certificates via Let's Encrypt.

### Install Caddy
Follow the official instructions for your OS: https://caddyserver.com/docs/install

### Configure Caddy
Edit the Caddyfile (usually located at `/etc/caddy/Caddyfile`):

```caddyfile
mugisk.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

*Alternatively, if you use Nginx, you can set up a reverse proxy and use Certbot to provision Let's Encrypt certificates.*

## 5. Required Open Ports

Ensure your VPS firewall allows inbound traffic on the following ports:

- **22 (TCP):** SSH access
- **80 (TCP):** HTTP (required for Let's Encrypt validation and redirection to HTTPS)
- **443 (TCP):** HTTPS

*Note: Port 3000 should NOT be opened to the public internet. Access to the backend should strictly go through the reverse proxy on port 443.*

## 6. Pointing the Desktop Client

Once your backend is running securely at `https://mugisk.yourdomain.com`, you must configure your Electron desktop client.

1. Open the Mugisk desktop app.
2. In the "Server URL" input field (on the login/connection screen), enter your domain:
   `https://mugisk.yourdomain.com`
3. Enter your login credentials (the default admin account generated during the seeding process, or any account created via the admin panel).
