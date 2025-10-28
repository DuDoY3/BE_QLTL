#!/bin/bash

# Script to start HPC Drive server
echo "🚀 Starting HPC Drive server..."

# Navigate to project directory
cd "/mnt/d/Download/Quản lý tài liệu/hpc_drive-main"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Creating one..."
    cat > .env << EOF
# Database Configuration for Docker
DATABASE_URL="postgresql://postgres:password@db:5432/hpc_drive_dev"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Server Port
PORT=8001
NODE_ENV=development
EOF
    echo "✅ .env file created"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate dev

# Start server
echo "🎯 Starting development server..."
pnpm dev

