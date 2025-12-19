import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';

@Injectable()
export class GoogleAiService {
  private readonly logger = new Logger(GoogleAiService.name);
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly model: any = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');

    if (!apiKey || apiKey === 'your_google_ai_api_key_here') {
      this.logger.warn('Google AI API key not configured. AI-powered image search will be disabled.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use Gemini 1.5 Flash for vision tasks (fast and cost-effective)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.logger.log('Google AI service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google AI service:', error);
    }
  }

  /**
   * Check if Google AI is available
   */
  isAvailable(): boolean {
    return this.model !== null;
  }

  /**
   * Analyze an image and generate a detailed description
   * @param imagePath Path to the image file
   * @returns Detailed description of the image including colors, patterns, materials, etc.
   */
  async analyzeImage(imagePath: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Google AI service is not available. Please configure GOOGLE_AI_API_KEY.');
    }

    try {
      this.logger.log(`Analyzing image: ${imagePath}`);

      // Read image file and convert to base64
      const imageBuffer = readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      const prompt = `Analyze this fabric/fashion product image in detail. Describe:
1. Primary colors and color patterns
2. Material type (silk, cotton, polyester, etc.)
3. Texture and weave pattern
4. Any distinctive features or patterns
5. Overall style and appearance

Provide a concise but comprehensive description suitable for product matching.`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
      ]);

      const response = await result.response;
      const description = response.text();

      this.logger.log(`Image analysis complete. Description length: ${description.length}`);
      return description;
    } catch (error) {
      this.logger.error('Error analyzing image:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  /**
   * Compare two images for similarity using AI
   * @param image1Path Path to first image
   * @param image2Path Path to second image
   * @returns Similarity score (0-100) and explanation
   */
  async compareImages(
    image1Path: string,
    image2Path: string,
  ): Promise<{ similarity: number; explanation: string }> {
    if (!this.isAvailable()) {
      throw new Error('Google AI service is not available. Please configure GOOGLE_AI_API_KEY.');
    }

    try {
      this.logger.log(`Comparing images: ${image1Path} vs ${image2Path}`);

      // Read both images
      const image1Buffer = readFileSync(image1Path);
      const image2Buffer = readFileSync(image2Path);
      const base64Image1 = image1Buffer.toString('base64');
      const base64Image2 = image2Buffer.toString('base64');
      const mimeType1 = this.getMimeType(image1Path);
      const mimeType2 = this.getMimeType(image2Path);

      const prompt = `Compare these two fabric/fashion product images. 
Analyze their similarity based on:
1. Color similarity
2. Material type
3. Pattern and texture
4. Overall appearance

Provide:
1. A similarity score from 0-100 (where 100 is identical)
2. A brief explanation of similarities and differences

Format your response as:
SIMILARITY: [score]
EXPLANATION: [your explanation]`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image1,
            mimeType: mimeType1,
          },
        },
        {
          inlineData: {
            data: base64Image2,
            mimeType: mimeType2,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse the response
      const similarityMatch = text.match(/SIMILARITY:\s*(\d+)/i);
      const explanationMatch = text.match(/EXPLANATION:\s*(.+)/is);

      const similarity = similarityMatch ? parseInt(similarityMatch[1], 10) : 0;
      const explanation = explanationMatch ? explanationMatch[1].trim() : text;

      this.logger.log(`Image comparison complete. Similarity: ${similarity}%`);
      return { similarity, explanation };
    } catch (error) {
      this.logger.error('Error comparing images:', error);
      throw new Error(`Failed to compare images: ${error.message}`);
    }
  }

  /**
   * Generate a search-optimized description for a product image
   * @param imagePath Path to the image file
   * @returns Keywords and features for search matching
   */
  async generateSearchKeywords(imagePath: string): Promise<string[]> {
    if (!this.isAvailable()) {
      throw new Error('Google AI service is not available. Please configure GOOGLE_AI_API_KEY.');
    }

    try {
      const description = await this.analyzeImage(imagePath);

      // Extract keywords from description
      const prompt = `From this product description, extract 5-10 key search terms (colors, materials, patterns, styles):

${description}

Return only the keywords, comma-separated.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const keywordsText = response.text();

      // Parse keywords
      const keywords = keywordsText
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      return keywords;
    } catch (error) {
      this.logger.error('Error generating search keywords:', error);
      return [];
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    return mimeTypes[ext || 'jpeg'] || 'image/jpeg';
  }
}
