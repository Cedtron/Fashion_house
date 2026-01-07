@echo off
echo 🚀 Starting deployment build process...

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 goto error

REM Build backend
echo 🔧 Building backend...
cd back-end

REM Ensure nest CLI is available
call npm install @nestjs/cli
if errorlevel 1 goto error

REM Try to build
call npm run build
if errorlevel 1 (
    echo ⚠️ Nest build failed, trying fallback...
    call npx tsc -p tsconfig.build.json
    if errorlevel 1 goto backend_error
    echo ✅ Backend fallback build successful
) else (
    echo ✅ Backend build successful
)

cd ..

REM Build frontend
echo 🎨 Building frontend...
cd front-end

call npm run build
if errorlevel 1 goto frontend_error

echo ✅ Frontend build successful
cd ..

echo 🎉 Build completed successfully!

REM Check dist folders
if exist "back-end\dist" (
    echo ✅ Backend dist folder exists
) else (
    echo ❌ Backend dist folder missing
)

if exist "front-end\dist" (
    echo ✅ Frontend dist folder exists
) else (
    echo ❌ Frontend dist folder missing
)

goto end

:backend_error
echo ❌ Backend build failed completely
cd ..
exit /b 1

:frontend_error
echo ❌ Frontend build failed
cd ..
exit /b 1

:error
echo ❌ Build process failed
exit /b 1

:end
echo ✅ Build process completed