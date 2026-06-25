#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting Mugisk Server..."

# We are in /app directory where standalone is copied.
# Prisma schema and seed should be in /app/server/prisma.

cd /app/server

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database (if empty)..."
npx tsx prisma/seed.ts

echo "Starting Next.js server..."
# Next.js standalone server starts from the workspace root context
cd /app
exec node server/server.js
