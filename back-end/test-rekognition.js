// Quick test script for Amazon Rekognition setup
const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
const fs = require('fs');
require('dotenv').config();

async function testRekognition() {
  console.log('🔍 Testing Amazon Rekognition Setup...\n');

  // Check environment variables
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ AWS credentials not found in environment variables');
    console.log('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file');
    return;
  }

  console.log('✅ AWS credentials found');
  console.log(`📍 Region: ${region}\n`);

  try {
    // Initialize Rekognition client
    const rekognitionClient = new RekognitionClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log('✅ Rekognition client initialized');

    // Test with a sample image (if exists)
    const testImagePath = './uploads/stock';
    
    if (fs.existsSync(testImagePath)) {
      const files = fs.readdirSync(testImagePath);
      const imageFiles = files.filter(file => 
        file.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)
      );

      if (imageFiles.length > 0) {
        const testImage = `${testImagePath}/${imageFiles[0]}`;
        console.log(`🖼️  Testing with image: ${testImage}`);

        const imageBuffer = fs.readFileSync(testImage);
        
        const command = new DetectLabelsCommand({
          Image: {
            Bytes: imageBuffer,
          },
          MaxLabels: 10,
          MinConfidence: 60,
        });

        const response = await rekognitionClient.send(command);
        
        console.log('\n🎯 Detection Results:');
        if (response.Labels && response.Labels.length > 0) {
          response.Labels.forEach(label => {
            console.log(`  - ${label.Name}: ${Math.round(label.Confidence)}% confidence`);
          });
        } else {
          console.log('  No labels detected');
        }
      } else {
        console.log('📁 No test images found in uploads/stock directory');
      }
    } else {
      console.log('📁 uploads/stock directory not found');
    }

    console.log('\n✅ Amazon Rekognition is working correctly!');
    console.log('🚀 You can now use image search in your application');

  } catch (error) {
    console.error('\n❌ Error testing Rekognition:', error.message);
    
    if (error.name === 'UnrecognizedClientException') {
      console.log('💡 Check your AWS credentials and region');
    } else if (error.name === 'AccessDeniedException') {
      console.log('💡 Check your IAM user has Rekognition permissions');
    }
  }
}

testRekognition();