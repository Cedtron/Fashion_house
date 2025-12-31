import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';

// Dynamic import for AWS SDK to make it optional
let RekognitionClient: any;
let DetectLabelsCommand: any;

try {
  const awsRekognition = require('@aws-sdk/client-rekognition');
  RekognitionClient = awsRekognition.RekognitionClient;
  DetectLabelsCommand = awsRekognition.DetectLabelsCommand;
} catch (error) {
  console.warn('AWS SDK not installed. Amazon Rekognition will be disabled.');
}

@Injectable()
export class RekognitionService {
  private readonly logger = new Logger(RekognitionService.name);
  private readonly rekognitionClient: any = null;
  private readonly skipRekognition: boolean;

  constructor(private configService: ConfigService) {
    // Check if Amazon Rekognition should be skipped
    this.skipRekognition = this.configService.get<string>('SKIP_AMAZON_REKOGNITION') === 'true';
    
    if (this.skipRekognition) {
      this.logger.log('Amazon Rekognition is disabled via SKIP_AMAZON_REKOGNITION=true');
      return;
    }

    // Check if AWS SDK is available
    if (!RekognitionClient || !DetectLabelsCommand) {
      this.logger.warn('AWS SDK not installed. Amazon Rekognition image search will be disabled.');
      return;
    }

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not configured. Amazon Rekognition image search will be disabled.');
      return;
    }

    try {
      this.rekognitionClient = new RekognitionClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('Amazon Rekognition service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Amazon Rekognition service:', error);
    }
  }

  /**
   * Check if Amazon Rekognition is available
   */
  isAvailable(): boolean {
    if (this.skipRekognition) {
      return false;
    }
    return this.rekognitionClient !== null;
  }

  /**
   * Analyze an image and detect labels/objects
   * @param imagePath Path to the image file
   * @returns Array of detected labels with confidence scores
   */
  async analyzeImage(imagePath: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Amazon Rekognition service is not available. Please configure AWS credentials.');
    }

    try {
      this.logger.log(`Analyzing image with Rekognition: ${imagePath}`);

      // Read image file
      const imageBuffer = readFileSync(imagePath);

      const command = new DetectLabelsCommand({
        Image: {
          Bytes: imageBuffer,
        },
        MaxLabels: 20,
        MinConfidence: 60,
      });

      const response = await this.rekognitionClient.send(command);
      
      // Convert labels to descriptive text
      const labels = response.Labels || [];
      const description = labels
        .map(label => `${label.Name} (${Math.round(label.Confidence)}% confidence)`)
        .join(', ');

      this.logger.log(`Image analysis complete. Found ${labels.length} labels`);
      return description || 'No significant features detected';
    } catch (error) {
      this.logger.error('Error analyzing image with Rekognition:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  /**
   * Compare two images for similarity using Amazon Rekognition
   * @param image1Path Path to first image
   * @param image2Path Path to second image
   * @returns Similarity score (0-100) and explanation
   */
  async compareImages(
    image1Path: string,
    image2Path: string,
  ): Promise<{ similarity: number; explanation: string }> {
    if (!this.isAvailable()) {
      throw new Error('Amazon Rekognition service is not available. Please configure AWS credentials.');
    }

    try {
      this.logger.log(`Comparing images with Rekognition: ${image1Path} vs ${image2Path}`);

      // Read both images
      const sourceImageBuffer = readFileSync(image1Path);
      const targetImageBuffer = readFileSync(image2Path);

      // Get labels for both images to compare content
      const [sourceLabels, targetLabels] = await Promise.all([
        this.getImageLabels(sourceImageBuffer),
        this.getImageLabels(targetImageBuffer),
      ]);

      // Calculate similarity based on common labels
      const similarity = this.calculateLabelSimilarity(sourceLabels, targetLabels);
      
      const commonLabels = sourceLabels.filter(sourceLabel =>
        targetLabels.some(targetLabel => 
          targetLabel.Name === sourceLabel.Name && 
          Math.abs(targetLabel.Confidence - sourceLabel.Confidence) < 30
        )
      );

      const explanation = commonLabels.length > 0
        ? `Common features: ${commonLabels.map(l => l.Name).join(', ')}`
        : 'No significant common features detected';

      this.logger.log(`Image comparison complete. Similarity: ${similarity}%`);
      return { similarity, explanation };
    } catch (error) {
      this.logger.error('Error comparing images with Rekognition:', error);
      throw new Error(`Failed to compare images: ${error.message}`);
    }
  }

  /**
   * Get labels for an image buffer
   */
  private async getImageLabels(imageBuffer: Buffer): Promise<any[]> {
    const command = new DetectLabelsCommand({
      Image: {
        Bytes: imageBuffer,
      },
      MaxLabels: 20,
      MinConfidence: 60,
    });

    const response = await this.rekognitionClient.send(command);
    return response.Labels || [];
  }

  /**
   * Calculate similarity percentage based on common labels
   */
  private calculateLabelSimilarity(labels1: any[], labels2: any[]): number {
    if (labels1.length === 0 && labels2.length === 0) {
      return 100; // Both images have no detectable features
    }

    if (labels1.length === 0 || labels2.length === 0) {
      return 0; // One image has features, the other doesn't
    }

    // Find matching labels with similar confidence
    let matchScore = 0;
    let totalPossibleScore = 0;

    for (const label1 of labels1) {
      totalPossibleScore += label1.Confidence;
      
      const matchingLabel = labels2.find(label2 => 
        label2.Name === label1.Name
      );

      if (matchingLabel) {
        // Calculate match quality based on confidence similarity
        const confidenceDiff = Math.abs(label1.Confidence - matchingLabel.Confidence);
        const matchQuality = Math.max(0, 100 - confidenceDiff) / 100;
        matchScore += label1.Confidence * matchQuality;
      }
    }

    // Calculate similarity as percentage
    const similarity = totalPossibleScore > 0 ? (matchScore / totalPossibleScore) * 100 : 0;
    return Math.round(Math.min(100, Math.max(0, similarity)));
  }

  /**
   * Generate search keywords from image analysis
   * @param imagePath Path to the image file
   * @returns Array of keywords for searching
   */
  async generateSearchKeywords(imagePath: string): Promise<string[]> {
    if (!this.isAvailable()) {
      throw new Error('Amazon Rekognition service is not available.');
    }

    try {
      const imageBuffer = readFileSync(imagePath);
      const labels = await this.getImageLabels(imageBuffer);
      
      // Extract keywords from labels
      const keywords = labels
        .filter(label => label.Confidence > 70) // Only high-confidence labels
        .map(label => label.Name.toLowerCase())
        .slice(0, 10); // Limit to top 10 keywords

      return keywords;
    } catch (error) {
      this.logger.error('Error generating search keywords:', error);
      return [];
    }
  }
}