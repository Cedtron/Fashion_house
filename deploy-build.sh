#!/bin/bash

echo "🚀 Starting deployment build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build backend
echo "🔧 Building backend..."
cd back-end

# Ensure nest CLI is available
npm install @nestjs/cli

# Try to build
if npm run build; then
    echo "✅ Backend build successful"
else
    echo "⚠️ Nest build failed, trying fallback..."
    if npx tsc -p tsconfig.build.json; then
        echo "✅ Backend fallback build successful"
    else
        echo "❌ Backend build failed completely"
        exit 1
    fi
fi

cd ..

# Build frontend
echo "🎨 Building frontend..."
cd front-end

if npm run build; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

cd ..

echo "🎉 Build completed successfully!"

# Check dist folders
if [ -d "back-end/dist" ]; then
    echo "✅ Backend dist folder exists"
else
    echo "❌ Backend dist folder missing"
fi

if [ -d "front-end/dist" ]; then
    echo "✅ Frontend dist folder exists"
else
    echo "❌ Frontend dist folder missing"
fi