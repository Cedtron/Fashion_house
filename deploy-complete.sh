#!/bin/bash

# Fashion House EC2 Complete Deployment Script
set -e

echo "🚀 Starting Fashion House deployment on EC2..."

# Update system
sudo yum update -y

# Install Git
sudo yum install -y git

# Install Node.js 22.x
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# Install Python 3.13
sudo yum install -y python3 python3-pip

# Install MySQL
sudo yum install -y mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Clone the repository
cd /home/ec2-user
git clone https://github.com/Cedtron/Fashion_house.git
cd Fashion_house

# Install dependencies
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

# Configure Nginx
sudo tee /etc/nginx/conf.d/fashion-house.conf > /dev/null << 'EOL'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

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

echo "✅ Deployment complete!"
echo "🌐 Your app is running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)"
echo "📊 Monitor with: pm2 status"