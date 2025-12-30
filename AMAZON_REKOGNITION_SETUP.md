# Amazon Rekognition Integration Setup

This guide will help you replace Google Image Search with Amazon Rekognition for image recognition in your Fashion House project.

## 🚀 What's Changed

- **Replaced**: Google AI/Gemini image search
- **Added**: Amazon Rekognition for image analysis and comparison
- **Maintained**: 60% similarity threshold for matching
- **Improved**: Better label-based image comparison

## 📋 Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS IAM User**: Create a user with Rekognition permissions
3. **Node.js**: Ensure you have Node.js installed

## 🔧 Installation Steps

### Step 1: Install Dependencies

```bash
cd back-end
npm install aws-sdk @aws-sdk/client-rekognition
```

### Step 2: AWS Setup

1. **Create AWS Account** (if you don't have one):
   - Go to [AWS Console](https://aws.amazon.com/)
   - Sign up for a new account

2. **Create IAM User**:
   - Go to [IAM Console](https://console.aws.amazon.com/iam/)
   - Click "Users" → "Add User"
   - Choose "Programmatic access"
   - Attach policy: `AmazonRekognitionFullAccess`
   - Save the **Access Key ID** and **Secret Access Key**

3. **Configure Environment Variables**:
   - Copy `.env.example` to `.env`
   - Add your AWS credentials:

```env
# Amazon Rekognition Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
```

### Step 3: Update Your Environment

Update your `.env` file with the AWS credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=fashion_house

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h

# Amazon Rekognition Configuration
AWS_ACCESS_KEY_ID=AKIA...your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=us-east-1

# Server Configuration
PORT=3000
```

## 🎯 How It Works

### Image Search Process

1. **Hash-based Search** (Fast):
   - Uses perceptual hashing for quick similarity matching
   - Compares uploaded image hash with stored image hashes
   - Returns matches with 60%+ similarity

2. **Rekognition Fallback** (Accurate):
   - If no hash matches found, uses Amazon Rekognition
   - Analyzes image labels and features
   - Compares common labels between images
   - Returns matches with 60%+ similarity

### Key Features

- **Label Detection**: Identifies objects, colors, patterns in images
- **Similarity Scoring**: Calculates match percentage based on common features
- **Confidence Levels**: Only uses high-confidence labels (60%+)
- **Graceful Fallback**: Falls back to hash matching if Rekognition fails

## 🔍 API Endpoints

The existing endpoints remain the same:

- `POST /stock/search-by-photo` - Upload image to search for similar products
- `POST /stock/:id/image` - Upload image for a stock item

## 📊 Response Format

Search results now include Rekognition data:

```json
{
  "id": 1,
  "stockId": "FH001",
  "product": "Silk Fabric",
  "similarity": 85,
  "searchMethod": "rekognition",
  "rekognitionExplanation": "Common features: Clothing, Fabric, Textile",
  "rekognitionDescription": "Clothing (95% confidence), Fabric (88% confidence), Textile (82% confidence)"
}
```

## 💰 Cost Considerations

Amazon Rekognition pricing (as of 2024):
- **Image Analysis**: $0.001 per image
- **Face Comparison**: $0.001 per comparison
- **Free Tier**: 5,000 images per month for first 12 months

For a typical fashion inventory with 1000 products and 100 searches per day:
- Monthly cost: ~$3-5 USD

## 🛠️ Troubleshooting

### Common Issues

1. **"AWS credentials not configured"**:
   - Check your `.env` file has correct AWS keys
   - Verify the IAM user has Rekognition permissions

2. **"Region not supported"**:
   - Use supported regions: `us-east-1`, `us-west-2`, `eu-west-1`

3. **"No matches found"**:
   - Ensure images are clear and well-lit
   - Try different angles or lighting
   - Check if stock images exist in database

### Debug Mode

Enable detailed logging by setting:
```env
NODE_ENV=development
```

## 🔄 Migration from Google AI

The system automatically falls back to hash-based matching if Rekognition is unavailable, ensuring no downtime during migration.

## 📞 Support

If you encounter issues:
1. Check AWS CloudTrail for API call logs
2. Verify IAM permissions
3. Test with sample images first
4. Check server logs for detailed error messages

---

**Note**: Keep your AWS credentials secure and never commit them to version control!