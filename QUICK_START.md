# 🚀 Fashion House - Quick Start Guide

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MySQL Server** running on your machine
3. **Git** (optional)

## 🔧 One Command Setup

```bash
npm start
```

That's it! This single command will:
- Install all dependencies (backend + frontend)
- Setup the database automatically
- Start both backend and frontend servers

## 🌐 Access Your Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api

## ⚙️ Manual Setup (if needed)

### Configure Database
Edit `back-end/.env` file if you need different MySQL settings:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_DATABASE=fashion_house
```

### Setup Amazon Rekognition (Optional)
Add AWS credentials to `back-end/.env`:

```env
# Amazon Rekognition Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

## 🛠️ Additional Commands

```bash
# Install dependencies only
npm run install:all

# Setup database only
npm run setup:db

# Build for production
npm run build

# Start production mode
npm run start:prod
```

## 🛠️ Troubleshooting

### Backend Won't Start?
1. **Check MySQL**: Make sure MySQL server is running
2. **Check credentials** in `back-end/.env`
3. **Run setup**: `npm run setup:db`

### Database Connection Issues?
1. **Test connection**: `npm run setup:db`
2. **Check MySQL service**: Make sure it's running
3. **Verify credentials**: Update `back-end/.env`

## 🎯 Key Features

- **Stock Management**: Add, edit, delete inventory items
- **Image Search**: Upload images to find similar products (60% match)
- **Color Detection**: Automatic color extraction from images
- **User Management**: Authentication and authorization
- **API Documentation**: Swagger UI available

## 🔍 Image Search with Amazon Rekognition

1. Upload stock items with images
2. Use "Search by Photo" feature
3. System finds similar items with 60%+ similarity
4. Uses hash-based search + Amazon Rekognition fallback

---

**Just run `npm start` and you're ready to go!**