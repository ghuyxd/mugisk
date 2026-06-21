# Phase N — Mugisk Server Dockerfile
# This file will be implemented in a future phase once the server is production-ready.
# For now, run the server locally with: pnpm dev:server

# ── Intended multi-stage build outline (to be implemented) ───────────────────
#
# Stage 1: deps
#   FROM node:20-alpine AS deps
#   Install production dependencies
#
# Stage 2: builder
#   FROM node:20-alpine AS builder
#   Copy deps, build Next.js app (next build)
#   Run prisma generate
#
# Stage 3: runner
#   FROM node:20-alpine AS runner
#   Copy .next/standalone output
#   Set NODE_ENV=production
#   Expose PORT 3000
#   CMD ["node", "server.js"]
# ─────────────────────────────────────────────────────────────────────────────

FROM scratch
LABEL maintainer="mugisk"
LABEL description="Placeholder — see comment above for the intended build outline"
