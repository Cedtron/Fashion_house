@echo off
echo 🚀 Deploying Fashion House to AWS EC2...
echo.

REM Configuration
set EC2_HOST=ec2-13-220-142-251.compute-1.amazonaws.com
set EC2_USER=ubuntu
set KEY_PATH=%USERPROFILE%\Downloads\kampala.pem
set APP_NAME=fashion-house
set REMOTE_DIR=/home/ubuntu/%APP_NAME%

echo 📡 Server: %EC2_HOST%
echo 🔑 Key: %KEY_PATH%
echo 📁 Remote Directory: %REMOTE_DIR%
echo.

echo ⚠️  IMPORTANT: Make sure you have:
echo    1. WSL or Git Bash installed for SSH/SCP commands
echo    2. The kampala.pem file in your Downloads folder
echo    3. Opened security groups for ports 3000 and 5173
echo.

echo 🔧 To deploy manually, run these commands in Git Bash or WSL:
echo.
echo # 1. Set key permissions
echo chmod 400 "%KEY_PATH%"
echo.
echo # 2. Connect to server
echo ssh -i "%KEY_PATH%" %EC2_USER%@%EC2_HOST%
echo.
echo # 3. Setup server (run on EC2)
echo sudo apt update ^&^& sudo apt upgrade -y
echo curl -fsSL https://deb.nodesource.com/setup_18.x ^| sudo -E bash -
echo sudo apt-get install -y nodejs mysql-server git
echo sudo npm install -g pm2
echo.
echo # 4. Upload files (run from your project folder)
echo scp -i "%KEY_PATH%" -r . %EC2_USER%@%EC2_HOST%:%REMOTE_DIR%
echo.
echo Press any key to continue with manual instructions...
pause > nul

echo.
echo 📋 Manual Deployment Steps:
echo.
echo 1. Open Git Bash or WSL in your project folder
echo 2. Run: chmod 400 "%KEY_PATH%"
echo 3. Run: ssh -i "%KEY_PATH%" %EC2_USER%@%EC2_HOST%
echo 4. On the server, run the setup commands above
echo 5. Upload your project files
echo 6. Install dependencies and start the app
echo.
echo 🌐 After deployment, access:
echo    Frontend: http://%EC2_HOST%:5173
echo    Backend: http://%EC2_HOST%:3000
echo    API Docs: http://%EC2_HOST%:3000/api
echo.
pause