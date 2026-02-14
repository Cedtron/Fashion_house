#!/bin/bash

echo "🚀 Building and deploying Fashion House app..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/

# Build for production
echo "🔨 Building for production..."
npm run build:prod

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t fashionhouse-frontend .

# Stop and remove existing container
echo "🛑 Stopping existing container..."
docker stop fashionhouse-frontend 2>/dev/null || true
docker rm fashionhouse-frontend 2>/dev/null || true

# Run new container
echo "▶️ Starting new container..."
docker run -d \
  --name fashionhouse-frontend \
  -p 80:80 \
  --restart unless-stopped \
  fashionhouse-frontend

echo "✅ Deployment complete! App should be running on port 80"
echo "🌐 Check your app at: http://your-ec2-ip"

# Show container status
docker ps | grep fashionhouse-frontend