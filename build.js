#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting build process...\n');

function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`📂 Running in: ${cwd}`);
    console.log(`⚡ Command: ${command}`);
    
    const result = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    console.log('✅ Command completed successfully\n');
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(`Error: ${error.message}\n`);
    throw error;
  }
}

async function buildProject() {
  try {
    // Build backend
    console.log('🔧 Building Backend...');
    const backendPath = path.join(__dirname, 'back-end');
    
    // Check if nest CLI is available
    try {
      runCommand('npx nest --version', backendPath);
      console.log('✅ NestJS CLI found, using nest build');
      runCommand('npm run build', backendPath);
    } catch (error) {
      console.log('⚠️  NestJS CLI not found, trying fallback build...');
      try {
        runCommand('npm run build:fallback', backendPath);
      } catch (fallbackError) {
        console.log('⚠️  Fallback build failed, trying direct TypeScript compilation...');
        runCommand('npx tsc -p tsconfig.build.json', backendPath);
      }
    }
    
    // Build frontend
    console.log('🎨 Building Frontend...');
    const frontendPath = path.join(__dirname, 'front-end');
    runCommand('npm run build', frontendPath);
    
    console.log('🎉 Build completed successfully!');
    
    // Check if dist folders exist
    const backendDist = path.join(backendPath, 'dist');
    const frontendDist = path.join(frontendPath, 'dist');
    
    if (fs.existsSync(backendDist)) {
      console.log('✅ Backend dist folder created');
    } else {
      console.log('❌ Backend dist folder not found');
    }
    
    if (fs.existsSync(frontendDist)) {
      console.log('✅ Frontend dist folder created');
    } else {
      console.log('❌ Frontend dist folder not found');
    }
    
  } catch (error) {
    console.error('💥 Build failed:', error.message);
    process.exit(1);
  }
}

buildProject();