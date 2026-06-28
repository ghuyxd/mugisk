# Mugisk 🎵

> **Self-hosted music streaming platform — own your music, own your server.**

Mugisk is a modern, full-stack, self-hosted music streaming platform designed to give you complete control over your library. It features a beautiful Electron desktop client, a robust Next.js API backend, auto-updating library scanning, and intelligent AI tagging capabilities.

![Mugisk Desktop Client](./desktop/resources/icon.png) *(Note: Replace with actual screenshot of the player)*

---

## ✨ Key Features

- **Beautiful Desktop Client**: Built with React, Vite, and Electron. Experience a rich, Feishin-style UI with fluid animations, sorting, and seamless playback.
- **Auto-Syncing Library**: The Next.js backend uses `chokidar` to automatically detect new tracks dropped into your music folder and extracts metadata using `music-metadata`.
- **AI-Powered Exploration**: Connect an AI provider (like OpenAI or DeepSeek) to automatically tag your library with genres and generate dynamic, personalized "Explore" playlists. *Toggleable via the Admin panel!*
- **Admin Dashboard**: Manage your server, trigger manual library scans, view storage stats, and toggle features without editing config files.
- **Secure Authentication**: JWT-based access with refresh token rotation.
- **Docker-Ready**: Easy to deploy with a multi-stage Dockerfile and Docker Compose.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    subgraph Desktop Client
        UI[React / Vite UI]
        Main[Electron Main Process]
        Store[Electron Store]
    end

    subgraph Server
        API[Next.js API & Admin Panel]
        Watcher[Chokidar File Watcher]
        Parser[Music Metadata Parser]
    end

    subgraph Database
        PG[(PostgreSQL)]
        Prisma[Prisma ORM]
    end

    subgraph External Services
        AI[Anthropic/OpenAI API]
    end

    UI <--> |IPC| Main
    Main <--> |REST API| API
    Store --> Main
    Watcher --> |Triggers| Parser
    Parser --> API
    API <--> Prisma
    Prisma <--> PG
    API <--> |Feature Flagged| AI
```

---

## 🚀 Getting Started

### 🐳 Quickstart: Docker (Recommended for Self-Hosting)

The easiest way to get Mugisk running is via Docker Compose.

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/mugisk.git
   cd mugisk
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your secure passwords, secret keys, and point `MUSIC_LIBRARY_PATH` to your music folder.
4. Start the server:
   ```bash
   docker compose up --build -d
   ```
5. Your server is now running on `http://localhost:3000`. 
   Navigate to `/admin/settings` to view your dashboard (login with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env`).

For a detailed deployment guide including reverse proxy (Caddy/Nginx) setup, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### 💻 Local Development

1. **Prerequisites**: Node.js ≥ 20, pnpm ≥ 9, PostgreSQL running.
2. **Install**: `pnpm install`
3. **Configure**: Copy `.env.example` to `.env` and fill it out.
4. **Database**: Run `pnpm db:push` to apply the Prisma schema.
5. **Start Services**:
   ```bash
   pnpm dev:server   # Next.js server on http://localhost:3000
   pnpm dev:desktop  # Electron desktop client
   ```

To learn how to package the desktop client into `.exe`, `.dmg`, or `.AppImage`, see [docs/BUILDING.md](docs/BUILDING.md).

---

## 🛠️ Environment Variables

| Variable | Description | Example / Default |
|----------|-------------|-------------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://mugisk:mugisk_dev@postgres:5432/mugisk` |
| `JWT_SECRET` | Secret for signing access tokens | `super-secret-jwt-key` |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | `super-secret-refresh-key` |
| `MUSIC_LIBRARY_PATH` | Absolute path to your music directory | `/music` |
| `AI_API_KEY` | Optional key for AI features | `sk-...` |
| `AI_FEATURE_ENABLED` | Toggles AI features on/off dynamically | `true` |

---

## 📍 Project Status

Currently in **Phase 9 — Final Polish**. Mugisk is functionally complete!

| Phase | Description | Key Features |
|-------|-------------|--------------|
| **Phase 0-1** | Foundation & Scaffolding | Monorepo setup, shared types, base server/desktop configs. |
| **Phase 2** | Core Library | `chokidar` library scanning, `music-metadata` parsing, REST API routes, Prisma schema. |
| **Phase 3** | Authentication | JWT access and refresh token rotation, Admin Panel UI. |
| **Phase 4** | Desktop Player | Electron IPC, streaming endpoints, Feishin-style React UI. |
| **Phase 5** | Admin Features | Web-based library management, file upload, cover art generation. |
| **Phase 6** | AI Integration | Auto-tagging and playlist generation behind feature flags. |
| **Phase 7** | Refinement | Client polish, keyboard shortcuts, final UI/UX. |
| **Phase 8** | Deployment | Multi-stage Dockerfile, docker-compose, desktop packaging. |
| **Phase 9** | Final Polish | Finishing touches, robust error handling, and AI customization toggles. |

---

## 📄 License

MIT
