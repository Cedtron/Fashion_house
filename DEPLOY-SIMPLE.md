# Simple AWS EC2 Deployment

## One-Command Deployment

SSH to your EC2 instance and run:

```bash
ssh -i kampala.pem ec2-user@ec2-13-220-142-251.compute-1.amazonaws.com

# Run the deployment script
curl -sSL https://raw.githubusercontent.com/Cedtron/Fashion_house/main/deploy-complete.sh | bash
```

## What it does:
- Installs Node.js 22.x, Python 3.13, MySQL, Nginx, PM2
- Clones your GitHub repository
- Installs dependencies and builds the apps
- Sets up the database
- Configures PM2 for process management
- Sets up Nginx reverse proxy

## Access your app:
http://ec2-13-220-142-251.compute-1.amazonaws.com

## Management commands:
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart apps
pm2 restart all

# Update deployment
cd /home/ec2-user/Fashion_house
git pull
npm run build
pm2 restart all
```

## Security Group Requirements:
- Port 22 (SSH) ✓
- Port 80 (HTTP) - Add this to your security group