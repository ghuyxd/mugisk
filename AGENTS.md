# Mugisk Monorepo — Agent / AI Context

This file helps AI coding assistants understand the repository structure.

## Quick Summary

Mugisk is a **self-hosted music streaming platform** organized as a **pnpm monorepo**.

## Packages

| Package               | Path              | Description                              |
|-----------------------|-------------------|------------------------------------------|
| `@mugisk/server`      | `/server`         | Next.js 16 backend + Admin Panel         |
| `@mugisk/desktop`     | `/desktop`        | Electron 34 desktop client               |
| `@mugisk/shared-types`| `/packages/shared-types` | Shared TypeScript interfaces      |

## Key Conventions

- **TypeScript strict mode** everywhere
- **Prisma** for all DB access (`/server/prisma/schema.prisma`)
- **Prisma client** imported from `@/lib/prisma` (singleton pattern)
- **Shared types** imported from `@mugisk/shared-types`
- **API routes** under `server/src/app/api/`
- **ESLint + Prettier** enforced at the root level
- **pnpm** is the only supported package manager

## Phase Status

Currently in **Phase 1 — Scaffolding**. No business logic yet.
See `README.md` for the full roadmap.
