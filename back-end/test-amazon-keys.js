// Simple test script for Amazon credentials
require('dotenv').config();

async function testAmazonKeys() {
  console.log('🔍 Testing Amazon AWS Credentials...\n');

  // Check environment variables
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const skipRekognition = process.env.SKIP_AMAZON_REKOGNITION === 'true';

  console.log('📋 Configuration:');
  console.log(`  - Access Key ID: ${accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`  - Secret Key: ${secretAccessKey ? '***HIDDEN***' : 'NOT SET'}`);
  console.log(`  - Region: ${region}`);
  console.log(`  - Skip Rekognition: ${skipRekognition}\n`);

  if (skipRekognition) {
    console.log('✅ Amazon Rekognition is DISABLED via SKIP_AMAZON_REKOGNITION=true');
    console.log('🚀 Your app will work without Amazon AI - only other APIs will be used');
    return;
  }

  if (!accessKeyId || !secretAccessKey) {
    console.log('❌ AWS credentials not found in .env file');
    console.log('💡 To fix this:');
    console.log('   1. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your .env file');
    console.log('   2. OR set SKIP_AMAZON_REKOGNITION=true to disable Amazon AI');
    return;
  }

  try {
    // Try to import AWS SDK
    const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
    
    console.log('✅ AWS SDK found');

    // Initialize client with timeout
    const rekognitionClient = new RekognitionClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestHandler: {
        requestTimeout: 5000, // 5 second timeout
      }
    });

    console.log('✅ Rekognition client created');
    
    // Test with a simple API call (list models - doesn't require image)
    console.log('🔄 Testing AWS connection...');
    
    // Create a minimal test command
    const testCommand = new DetectLabelsCommand({
      Image: {
        Bytes: Buffer.from('test') // This will fail but test auth
      },
      MaxLabels: 1,
    });

    try {
      await rekognitionClient.send(testCommand);
    } catch (error) {
      if (error.name === 'InvalidImageFormatException') {
        console.log('✅ AWS credentials are VALID (got expected image format error)');
        console.log('🚀 Amazon Rekognition is ready to use!');
      } else if (error.name === 'UnrecognizedClientException') {
        console.log('❌ AWS credentials are INVALID');
        console.log('💡 Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
      } else if (error.name === 'Access);rrorle.ecatch(consoys().zonKestAma
}

tesage);
  }.mess:', erroredentialmazon crting Aror tesr('❌ Erconsole.erroror) {
     } catch (er

    }
    });
   message}` ${error.ame} -{error.nror: $ed er⚠️  Unexpectonsole.log(`     ce {
   ls
      } eAM user');to your Iess policy ccitionFullAazonRekognadd Am('💡 Please .logoleons
        cmissions');n pero Rekognitio valid but nntialsWS credelog('❌ Ae.   consol{
     xception') DeniedE