# Phase 8 — Mugisk Server Dockerfile
FROM node:20-alpine AS base

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy the entire workspace metadata
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY packages/shared-types/package.json packages/shared-types/

# Install dependencies via pnpm
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY . .

RUN npm install -g pnpm

# Generate Prisma Client and build the server
RUN pnpm --filter @mugisk/server db:generate
# Next.js build requires NEXT_PUBLIC environment variables if any, but we don't have them
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm --filter @mugisk/server build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install openssl for Prisma and tsx for seeding
RUN apk add --no-cache openssl && npm install -g prisma@6 tsx

# Copy public folder and Next.js standalone build
COPY --from=builder /app/server/public ./server/public
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/server/.next/standalone ./
COPY --from=builder /app/server/.next/static ./server/.next/static

# Copy Prisma schema and migrations for the start.sh script
COPY --from=builder /app/server/prisma ./server/prisma

# Next.js standalone tracing often misses Prisma engine files or dependencies needed for ad-hoc scripts like seed.ts.
# We explicitly install and generate the client here to guarantee it's fully present and working.
# (We install it in /app rather than /app/server to avoid npm parsing the pnpm workspace:* protocol in server/package.json)
RUN npm install @prisma/client@^6.2.1 bcryptjs && cd server && npx prisma generate

COPY server/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["./start.sh"]
