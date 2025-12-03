#!/bin/bash

echo "🚀 Setting up Brand Order System development environment..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Generate Prisma client
echo "🗄️ Setting up database..."
cd packages/database
pnpm db:generate
pnpm db:push
cd ../..

# Build shared packages
echo "🔨 Building shared packages..."
pnpm --filter @brand-order-system/types build
pnpm --filter @brand-order-system/ui build
pnpm --filter @brand-order-system/database build

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  - Start API server: cd apps/api && pnpm dev"
echo "  - Start Admin panel: cd apps/admin && pnpm dev"
echo "  - Start Checkout app: cd apps/checkout && pnpm dev"