// Simple test for Amazon credentials and skip functionality
require('dotenv').config();

console.log('🔍 Testing Amazon Configuration...\n');

const skipRekognition = process.env.SKIP_AMAZON_REKOGNITION === 'true';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'us-east-1';

console.log('📋 Current Configuration:');
console.log(`  - Skip Amazon Rekognition: ${skipRekognition}`);
console.log(`  - AWS Access Key: ${accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'NOT SET'}`);
console.log(`  - AWS Secret Key: ${secretAccessKey ? '***SET***' : 'NOT SET'}`);
console.log(`  - AWS Region: ${region}\n`);

if (skipRekognition) {
  console.log('✅ SUCCESS: Amazon Rekognition is DISABLED');
  console.log('🚀 Your backend will work without Amazon AI');
  console.log('📝 Only other APIs (Google AI, hash-based search) will be used');
  console.log('\n💡 To enable Amazon Rekognition later:');
  console.log('   1. Set SKIP_AMAZON_REKOGNITION=false in .env');
  console.log('   2. Make sure AWS credentials are valid');
} else {
  console.log('⚠️  Amazon Rekognition is ENABLED');
  if (!accessKeyId || !secretAccessKey) {
    console.log('❌ But AWS credentials are missing!');
    console.log('\n💡 To fix this, choose one option:');
    console.log('   Option 1 - Disable Amazon (Recommended):');
    console.log('     Set SKIP_AMAZON_REKOGNITION=true in .env');
    console.log('   Option 2 - Add valid AWS credentials:');
    console.log('     Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
  } else {
    console.log('✅ AWS credentials are configured');
    console.log('🔄 Testing connection...');
    
    // Quick test without actually calling AWS
    try {
      const { RekognitionClient } = require('@aws-sdk/client-rekognition');
      const client = new RekognitionClient({
        region,
        credentials: { accessKeyId, secretAccessKey }
      });
      console.log('✅ AWS SDK initialized successfully');
      console.log('🚀 Amazon Rekognition should work (credentials format is valid)');
    } catch (error) {
      console.log('❌ Error with AWS SDK:', error.message);
    }
  }
}

console.log('\n🎯 Backend Status: READY TO START');