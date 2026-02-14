import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendPasswordResetEmail(email: string, code: string, username: string): Promise<boolean> {
    try {
      // For development, just log the code to console
      // In production, integrate with email service like SendGrid, AWS SES, etc.
      
      this.logger.log(`Password reset requested for ${email}`);
      console.log(`\n🔐 PASSWORD RESET CODE for ${email}: ${code}\n`);
      console.log(`📧 Email would be sent to: ${username} (${email})`);
      console.log(`⏰ Code expires in 15 minutes\n`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }

  async sendPasswordChangeConfirmation(email: string, username: string): Promise<boolean> {
    try {
      // For development, just log the confirmation
      // In production, integrate with email service like SendGrid, AWS SES, etc.
      
      this.logger.log(`Password change confirmation for ${email}`);
      console.log(`\n✅ PASSWORD CHANGED SUCCESSFULLY for ${email}\n`);
      console.log(`📧 Confirmation would be sent to: ${username} (${email})`);
      console.log(`🔒 Your password has been successfully updated\n`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password change confirmation to ${email}:`, error);
      return false;
    }
  }
}