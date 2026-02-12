#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma db push --accept-data-loss

echo "🌱 Running seed script..."
node scripts/seed-org.js

echo "🚀 Starting application..."
exec node server.js
