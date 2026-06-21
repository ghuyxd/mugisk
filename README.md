# Mugisk

> Self-hosted music streaming platform — own your music, own your server.

---

## Repository Layout

```
mugisk/                         ← monorepo root (pnpm workspaces)
├── server/                     ← @mugisk/server  · Next.js 16 (App Router)
│   ├── prisma/
│   │   └── schema.prisma       ← Prisma schema (PostgreSQL)
│   ├── src/
│   │   ├── app/                ← Next.js App Router pages & API routes
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        ← Home / landing page
│   │   │   ├── admin/          ← Admin Panel (future phase)
│   │   │   └── api/
│   │   │       └── health/     ← GET /api/health
│   │   └── lib/
│   │       └── prisma.ts       ← Prisma client singleton
│   └── Dockerfile              ← Placeholder (implemented in a future phase)
│
├── desktop/                    ← @mugisk/desktop · Electron + React + Vite
│   └── src/
│       ├── main/               ← Electron main process
│       │   └── index.ts
│       ├── preload/            ← Electron preload (contextBridge)
│       │   └── index.ts
│       └── renderer/           ← React renderer process
│           ├── index.html
│           └── src/
│               ├── main.tsx
│               ├── App.tsx
│               ├── env.d.ts
│               └── assets/
│                   └── index.css
│
├── packages/
│   └── shared-types/           ← @mugisk/shared-types · shared TS interfaces
│       └── src/
│           └── index.ts        ← User, Track, Album, Artist, Playlist, …
│
├── docker-compose.yml          ← postgres (named volume) + server stub
├── .env.example                ← All env vars documented
├── .eslintrc.cjs               ← Root ESLint config (shared)
├── .prettierrc.json            ← Root Prettier config (shared)
├── tsconfig.base.json          ← Base TypeScript config extended by all packages
├── pnpm-workspace.yaml         ← pnpm workspace definition
└── package.json                ← Root scripts + dev dependencies
```

---

## Tech Stack

| Layer            | Technology                                           |
|------------------|------------------------------------------------------|
| **Backend**      | Next.js 16 (App Router), TypeScript, Node.js         |
| **Database**     | PostgreSQL 16, Prisma ORM                            |
| **Desktop**      | Electron 34, React 18, Vite (electron-vite)          |
| **Styling**      | Tailwind CSS v4 (server), Vanilla CSS (desktop)      |
| **Auth**         | JWT (access + refresh tokens), bcryptjs, jose        |
| **File Watching**| chokidar                                             |
| **Tag Parsing**  | music-metadata                                       |
| **Shared Types** | `@mugisk/shared-types` workspace package             |
| **Deployment**   | Docker, Docker Compose                               |
| **AI (Phase N)** | Anthropic / OpenAI (optional integration)            |
| **Tooling**      | pnpm workspaces, ESLint, Prettier, TypeScript strict |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Docker** + **Docker Compose** (for the database)

### 1 — Clone and install

```bash
git clone https://github.com/your-org/mugisk.git
cd mugisk
pnpm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
```

### 3 — Start the database

```bash
docker compose up postgres -d
```

### 4 — Run Prisma migrations

```bash
pnpm db:migrate     # creates tables (dev only)
# or
pnpm db:push        # push schema without migration history
```

### 5 — Start development servers

```bash
# Start both Next.js server and Electron desktop concurrently:
pnpm dev

# Or individually:
pnpm dev:server     # Next.js on http://localhost:3000
pnpm dev:desktop    # Electron window
```

### Useful scripts

| Command              | Description                                      |
|----------------------|--------------------------------------------------|
| `pnpm dev`           | Start both server and desktop in watch mode      |
| `pnpm dev:server`    | Start Next.js dev server only                    |
| `pnpm dev:desktop`   | Start Electron dev window only                   |
| `pnpm build`         | Production build for all packages                |
| `pnpm lint`          | Run ESLint across the entire monorepo            |
| `pnpm format`        | Run Prettier across the entire monorepo          |
| `pnpm typecheck`     | Run `tsc --noEmit` across all packages           |
| `pnpm db:generate`   | Regenerate Prisma client after schema changes    |
| `pnpm db:migrate`    | Create and apply a new Prisma migration          |
| `pnpm db:studio`     | Open Prisma Studio in the browser                |

---

## Roadmap

This repository is currently in **Phase 1 — Scaffolding**.

Future phases will add:

- **Phase 2** — Library scanning (chokidar + music-metadata), REST/tRPC API, Prisma full schema
- **Phase 3** — JWT auth with refresh token rotation, Admin Panel UI
- **Phase 4** — Desktop player UI (Feishin-style), IPC communication, streaming
- **Phase 5** — Production Docker build, CI/CD pipeline
- **Phase N** — AI integration (auto-tagging, playlist generation via Anthropic/OpenAI)

---

## License

MIT
