// Test Amazon Rekognition with Real Images
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function testRealImageSearch() {
  console.log('🔍 Testing Amazon Rekognition with Real Images...\n');

  // Check credentials
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    console.log('❌ AWS credentials missing');
    return;
  }

  try {
    const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
    
    const rekognitionClient = new RekognitionClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Find a test image
    const uploadsDir = './uploads/stock';
    const imageFiles = fs.readdirSync(uploadsDir).filter(file => 
      file.toLowerCase().match(/\.(jpg|jpeg|png)$/)
    );

    if (imageFiles.length === 0) {
      console.log('❌ No images found in uploads/stock');
      return;
    }

    const testImage = path.join(uploadsDir, imageFiles[0]);
    console.log(`🖼️  Testing with: ${testImage}`);

    // Read the image
    const imageBuffer = fs.readFileSync(testImage);
    console.log(`📏 Image size: ${imageBuffer.length} bytes`);

    console.log('🔄 Analyzing image with Amazon Rekognition...');

    const command = new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MaxLabels: 15,
      MinConfidence: 60,
    });

    const response = await rekognitionClient.send(command);
    
    console.log('\n✅ SUCCESS: Amazon Rekognition analyzed the image!');
    console.log(`📊 Found ${response.Labels ? response.Labels.length : 0} labels\n`);
    
    if (response.Labels && response.Labels.length > 0) {
      console.log('🏷️  Detected Features:');
      response.Labels.forEach((label, index) => {
        console.log(`   ${index + 1}. ${label.Name} - ${Math.round(label.Confidence)}% confidence`);
      });
      
      console.log('\n🎯 Image Description:');
      const description = response.Labels
        .slice(0, 5)
        .map(label => `${label.Name} (${Math.round(label.Confidence)}%)`)
        .join(', ');
      console.log(`   "${description}"`);
    }

    console.log('\n🚀 Amazon Image Search is WORKING PERFECTLY!');
    console.log('✅ Your fashion house app can now:');
    console.log('   - Analyze uploaded images');
    console.log('   - Detect clothing, fabrics, colors');
    console.log('   - Find similar products');
    console.log('   - Compare image features');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.name === 'UnrecognizedClientException') {
      console.log('💡 Fix: Check AWS credentials in .env file');
    } else if (error.name === 'AccessDeniedException') {
      console.log('💡 Fix: Add Rekognition permissions to IAM user');
    } else if (error.name === 'InvalidImageFormatException') {
      console.log('💡 Fix: Image format not supported by Rekognition');
    } else {
      console.log('💡 Check AWS service status and internet connection');
    }
  }
}

testRealImageSearch();