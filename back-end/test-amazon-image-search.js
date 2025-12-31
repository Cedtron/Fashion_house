// Test Amazon Rekognition Image Search
require('dotenv').config();

async function testAmazonImageSearch() {
  console.log('🔍 Testing Amazon Rekognition Image Search...\n');

  // Check credentials
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  console.log('📋 AWS Configuration:');
  console.log(`  - Access Key: ${accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`  - Region: ${region}\n`);

  if (!accessKeyId || !secretAccessKey) {
    console.log('❌ AWS credentials missing in .env file');
    return;
  }

  try {
    // Import AWS SDK
    const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
    
    console.log('✅ AWS SDK loaded successfully');

    // Initialize client
    const rekognitionClient = new RekognitionClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log('✅ Rekognition client initialized');

    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x8E, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    console.log('🔄 Testing image analysis...');

    const command = new DetectLabelsCommand({
      Image: {
        Bytes: testImageBuffer,
      },
      MaxLabels: 10,
      MinConfidence: 60,
    });

    const response = await rekognitionClient.send(command);
    
    console.log('✅ Amazon Rekognition API call successful!');
    console.log(`📊 Found ${response.Labels ? response.Labels.length : 0} labels`);
    
    if (response.Labels && response.Labels.length > 0) {
      console.log('🏷️  Detected labels:');
      response.Labels.forEach(label => {
        console.log(`   - ${label.Name}: ${Math.round(label.Confidence)}% confidence`);
      });
    } else {
      console.log('📝 No labels detected (expected for test image)');
    }

    console.log('\n🎉 SUCCESS: Amazon Rekognition image search is working!');
    console.log('🚀 Your image search API is ready to use');

  } catch (error) {
    console.error('\n❌ Error testing Amazon Rekognition:', error.message);
    
    if (error.name === 'UnrecognizedClientException') {
      console.log('💡 Issue: Invalid AWS credentials');
      console.log('   Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    } else if (error.name === 'AccessDeniedException') {
      console.log('💡 Issue: No Rekognition permissions');
      console.log('   Add AmazonRekognitionFullAccess policy to your IAM user');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('💡 Issue: Network connection problem');
      console.log('   Check your internet connection');
    } else {
      console.log('💡 Unexpected error - check AWS service status');
    }
  }
}

testAmazonImageSearch();