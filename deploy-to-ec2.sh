#!/bin/bash

# Fashion House AWS EC2 Deployment Script
echo "🚀 Deploying Fashion House to AWS EC2..."

# Configuration
EC2_HOST="ec2-13-220-142-251.compute-1.amazonaws.com"
EC2_USER="ubuntu"  # Default for Ubuntu AMI, change to "ec2-user" for Amazon Linux
KEY_PATH="~/Downloads/kampala.pem"
APP_NAME="fashion-house"
REMOTE_DIR="/home/ubuntu/$APP_NAME"

echo "📡 Server: $EC2_HOST"
echo "🔑 Key: $KEY_PATH"
echo "📁 Remote Directory: $REMOTE_DIR"
echo ""

# Step 1: Prepare the server
echo "🔧 Setting up server environment..."
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" << 'EOF'
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL installation (set root password)
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'fashion123';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install -y git

echo "✅ Server setup complete!"
EOF

# Step 2: Upload application files
echo "📦 Uploading application files..."

# Create remote directory
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" "mkdir -p $REMOTE_DIR"

# Upload files (excluding node_modules and other unnecessary files)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'back-end/node_modules' \
  --exclude 'front-end/node_modules' \
  --exclude 'back-end/dist' \
  --exclude 'front-end/dist' \
  --exclude '*.log' \
  -e "ssh -i $KEY_PATH" \
  ./ "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"

# Step 3: Setup application on server
echo "🔧 Setting up application on server..."
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" << EOF
cd $REMOTE_DIR

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Setup environment
echo "⚙️ Setting up environment..."
cd back-end
cp .env.example .env

# Update .env with production settings
cat > .env << 'ENVEOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=fashion123
DB_DATABASE=fashion_house

# JWT Configuration
JWT_SECRET=fashion_house_production_secret_2024
JWT_EXPIRATION=24h

# Amazon Rekognition Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1

# Server Configuration
PORT=3000
ENVEOF

# Setup database
echo "🗄️ Setting up database..."
npm run setup-db

# Build applications
echo "🏗️ Building applications..."
cd ..
npm run build

# Setup PM2 ecosystem
cat > ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [
    {
      name: 'fashion-house-api',
      cwd: './back-end',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'fashion-house-web',
      cwd: './front-end',
      script: 'npx',
      args: 'serve -s dist -l 5173',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
PMEOF

# Install serve for frontend
cd front-end
npm install -g serve
cd ..

# Start applications with PM2
echo "🚀 Starting applications..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://$EC2_HOST:5173"
echo "🔗 Backend: http://$EC2_HOST:3000"
echo "📚 API Docs: http://$EC2_HOST:3000/api"
EOF

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$EC2_HOST:5173"
echo "   Backend API: http://$EC2_HOST:3000"
echo "   API Documentation: http://$EC2_HOST:3000/api"
echo ""
echo "🔧 Useful commands:"
echo "   SSH to server: ssh -i $KEY_PATH $EC2_USER@$EC2_HOST"
echo "   Check logs: pm2 logs"
echo "   Restart apps: pm2 restart all"
echo "   Stop apps: pm2 stop all"