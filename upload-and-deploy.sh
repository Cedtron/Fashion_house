#!/bin/bash

# Upload and Deploy Script (run from local machine)
set -e

EC2_HOST="ec2-13-220-142-251.compute-1.amazonaws.com"
KEY_FILE="kampala.pem"
APP_DIR="/var/www/fashion-house"

echo "🚀 Uploading Fashion House to EC2..."

# Upload project files
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  -e "ssh -i $KEY_FILE -o StrictHostKeyChecking=no" \
  ./ ec2-user@$EC2_HOST:$APP_DIR/

echo "📦 Installing dependencies on EC2..."
ssh -i $KEY_FILE ec2-user@$EC2_HOST << 'EOF'
cd /var/www/fashion-house

# Install all dependencies
npm run install:all

# Build applications
npm run build

# Setup database
npm run setup

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOL'
module.exports = {
  apps: [
    {
      name: 'fashion-house-backend',
      cwd: './back-end',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_USERNAME: 'root',
        DB_PASSWORD: '',
        DB_DATABASE: 'fashion_house'
      }
    },
    {
      name: 'fashion-house-frontend',
      cwd: './front-end',
      script: 'npx',
      args: 'vite preview --port 4173 --host',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOL

# Start applications with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

EOF

echo "🌐 Configuring Nginx..."
ssh -i $KEY_FILE ec2-user@$EC2_HOST << 'EOF'
sudo tee /etc/nginx/conf.d/fashion-house.conf > /dev/null << 'EOL'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

sudo nginx -t
sudo systemctl reload nginx
EOF

echo "✅ Deployment complete!"
echo "🌐 Your app is running at: http://$EC2_HOST"
echo "📊 Monitor with: ssh -i $KEY_FILE ec2-user@$EC2_HOST 'pm2 status'"