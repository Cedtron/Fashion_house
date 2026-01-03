# AWS EC2 Deployment Guide

## Prerequisites
- Your `kampala.pem` key file in the project root
- EC2 instance: `ec2-13-220-142-251.compute-1.amazonaws.com`

## Deployment Steps

### 1. First-time setup (run once)
```bash
# Make scripts executable
chmod +x deploy-to-ec2.sh upload-and-deploy.sh

# SSH to EC2 and run setup
ssh -i kampala.pem ec2-user@ec2-13-220-142-251.compute-1.amazonaws.com
wget https://raw.githubusercontent.com/your-repo/deploy-to-ec2.sh
chmod +x deploy-to-ec2.sh
./deploy-to-ec2.sh
exit
```

### 2. Deploy application
```bash
# From your local project directory
./upload-and-deploy.sh
```

### 3. Access your application
- Frontend: http://ec2-13-220-142-251.compute-1.amazonaws.com
- Backend API: http://ec2-13-220-142-251.compute-1.amazonaws.com/api

## Management Commands

### Check application status
```bash
ssh -i kampala.pem ec2-user@ec2-13-220-142-251.compute-1.amazonaws.com 'pm2 status'
```

### View logs
```bash
ssh -i kampala.pem ec2-user@ec2-13-220-142-251.compute-1.amazonaws.com 'pm2 logs'
```

### Restart applications
```bash
ssh -i kampala.pem ec2-user@ec2-13-220-142-251.compute-1.amazonaws.com 'pm2 restart all'
```

### Update deployment
```bash
./upload-and-deploy.sh
```

## Security Group Requirements
Ensure your EC2 security group allows:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS) - if using SSL

## Troubleshooting
- If MySQL fails: `sudo systemctl status mysqld`
- If Nginx fails: `sudo nginx -t`
- If apps fail: `pm2 logs`