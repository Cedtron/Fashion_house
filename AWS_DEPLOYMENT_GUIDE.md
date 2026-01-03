# 🚀 AWS EC2 Deployment Guide

## 📋 Prerequisites

1. **EC2 Instance**: Running Ubuntu (your instance is ready)
2. **Key File**: `kampala.pem` in Downloads folder
3. **Security Groups**: Ports 22, 3000, 5173 open
4. **SSH Client**: Git Bash, WSL, or terminal

## 🔧 Quick Deployment Steps

### Step 1: Connect to EC2

```bash
# Set key permissions (run once)
chmod 400 ~/Downloads/kampala.pem

# Connect to your EC2 instance
ssh -i ~/Downloads/kampala.pem ubuntu@ec2-13-220-142-251.compute-1.amazonaws.com
```

### Step 2: Setup Server Environment

Copy and paste these commands on your EC2 instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install -y mysql-server git

# Setup MySQL


# Install PM2 and serve
sudo npm install -g pm2 serve

# Create app directory
mkdir -p ~/fashion-house
```

### Step 3: Upload Your Project

From your **local machine** (in your project folder):

```bash
# Upload project files
scp -i ~/Downloads/kampala.pem -r . ubuntu@ec2-13-220-142-251.compute-1.amazonaws.com:~/fashion-house/
```

### Step 4: Setup Application on EC2

Back on your **EC2 instance**:

```bash
cd ~/fashion-house

# Install dependencies
npm run install:all

# Setup backend environment
cd back-end
cp .env.example .env

# Edit environment file
nano .env
```

**Update .env with these values:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=fashion123
DB_DATABASE=fashion_house
JWT_SECRET=fashion_house_production_secret_2024
JWT_EXPIRATION=24h
PORT=3000
```

**Continue setup:**
```bash
# Setup database
npm run setup-db

# Build applications
cd ..
npm run build

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'fashion-house-api',
      cwd: './back-end',
      script: 'dist/main.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 3000 }
    },
    {
      name: 'fashion-house-web',
      cwd: './front-end',
      script: 'serve',
      args: '-s dist -l 5173',
      instances: 1
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Access Your Application

- **Frontend**: http://ec2-13-220-142-251.compute-1.amazonaws.com:5173
- **Backend API**: http://ec2-13-220-142-251.compute-1.amazonaws.com:3000
- **API Docs**: http://ec2-13-220-142-251.compute-1.amazonaws.com:3000/api

## 🔧 AWS Security Groups Setup

Make sure these ports are open in your EC2 Security Group:

| Port | Protocol | Source | Description |
|------|----------|---------|-------------|
| 22   | TCP      | 0.0.0.0/0 | SSH |
| 3000 | TCP      | 0.0.0.0/0 | Backend API |
| 5173 | TCP      | 0.0.0.0/0 | Frontend |

## 🛠️ Useful Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs

# Restart applications
pm2 restart all

# Stop applications
pm2 stop all

# SSH to server
ssh -i ~/Downloads/kampala.pem ubuntu@ec2-13-220-142-251.compute-1.amazonaws.com
```

## 🔄 Update Deployment

To update your app after changes:

```bash
# 1. Upload new files
scp -i ~/Downloads/kampala.pem -r . ubuntu@ec2-13-220-142-251.compute-1.amazonaws.com:~/fashion-house/

# 2. On EC2, rebuild and restart
cd ~/fashion-house
npm run build
pm2 restart all
```

## 🎯 Amazon Rekognition Setup

Add your AWS credentials to the `.env` file on EC2:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

---

**Your Fashion House app with Amazon Rekognition image search is now live on AWS EC2!** 🎉