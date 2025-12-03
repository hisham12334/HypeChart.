#!/bin/bash

echo "🚀 Deploying Brand Order System to production..."

# Build all applications
echo "🔨 Building applications..."
pnpm build

# Run database migrations
echo "🗄️ Running database migrations..."
cd packages/database
pnpm db:migrate
cd ../..

# Deploy to your preferred platform
echo "☁️ Deploying to production..."
# Add your deployment commands here (e.g., Vercel, AWS, etc.)

echo "✅ Deployment complete!"