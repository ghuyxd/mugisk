# Mugisk

> Self-hosted music streaming platform — own your music, own your server.

Mugisk is a full-stack, self-hosted music streaming platform designed to give you complete control over your library. It features a responsive Electron desktop client, a robust Next.js API backend, auto-updating library scanning, and intelligent AI tagging capabilities.

---

## Architecture Overview

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

## Features (By Phase)

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

---

## Environment Variables Reference

| Variable | Description | Example / Default |
|----------|-------------|-------------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://mugisk:mugisk_dev@postgres:5432/mugisk` |
| `JWT_SECRET` | Secret for signing access tokens | `super-secret-jwt-key` |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | `super-secret-refresh-key` |
| `MUSIC_LIBRARY_PATH` | Absolute path to your music directory | `/music` |
| `AI_API_KEY` | Optional Anthropic or OpenAI key for AI features | `sk-...` |

---

## Getting Started

### Local Development (Non-Docker)

1. **Prerequisites**: Node.js ≥ 20, pnpm ≥ 9, PostgreSQL instance running.
2. **Install**: `pnpm install`
3. **Configure**: Copy `.env.example` to `.env` and fill it out.
4. **Database**: Run `pnpm db:push` to apply the Prisma schema.
5. **Start Services**:
   ```bash
   pnpm dev:server   # Next.js server on http://localhost:3000
   pnpm dev:desktop  # Electron desktop client
   ```

### Docker Setup (Production)

1. Edit `.env` to include your production secrets.
2. Run `docker compose up --build -d`.
3. This brings up the database and the Next.js server. Migrations are run automatically on container start.
4. Your server will be accessible on `http://localhost:3000` (or behind a reverse proxy like Caddy/Nginx).

For detailed deployment instructions on a VPS, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

For detailed desktop client build instructions, see [docs/BUILDING.md](docs/BUILDING.md).

---

## API Endpoint Reference

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `GET` | `/api/health` | No | Server health check |
| `POST` | `/api/auth/login` | No | Authenticate and get JWT |
| `POST` | `/api/auth/refresh` | No (needs refresh token) | Refresh access token |
| `GET` | `/api/library/artists` | Yes | List all artists |
| `GET` | `/api/library/albums` | Yes | List all albums |
| `GET` | `/api/library/tracks` | Yes | List all tracks |
| `GET` | `/api/stream/[trackId]` | Yes | Stream track audio file |
| `POST` | `/api/admin/library/scan` | Yes (Admin) | Trigger manual library scan |
| `POST` | `/api/admin/library/upload` | Yes (Admin) | Upload new track to library |
| `POST` | `/api/ai/tag` | Yes (Admin) | Auto-tag track metadata using AI |
| `POST` | `/api/ai/playlist` | Yes | Generate a smart playlist via AI |

---

## License

MIT
