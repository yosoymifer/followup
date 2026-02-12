#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma db push --accept-data-loss || echo "⚠️ Migration failed, continuing..."

echo "🌱 Running seed script..."
node scripts/seed-org.js || echo "⚠️ Seed skipped (may already exist)"

echo "🚀 Starting application..."
exec node server.js
