#!/bin/sh
set -e

echo "Running database migrations..."
# Use npx prisma to run migrations. Since we only copied prisma folder and not the global CLI,
# we can run it using the local module. Wait, standalone doesn't include the prisma CLI globally.
# Actually, the runner stage copied node_modules from builder:
# COPY --from=builder --chown=nextjs:nodejs /app/server/.next/standalone/node_modules ./node_modules
# This includes the server node_modules which should have prisma if we keep it in dependencies or install it.
# Let's just use `npx prisma`.

# Try to run migrations
npx --yes prisma migrate deploy

# Try to seed the database
echo "Seeding the database (if empty)..."
npx --yes tsx prisma/seed.ts || echo "Seed skipped or failed."

echo "Starting Next.js server..."
exec node server.js
