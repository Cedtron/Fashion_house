import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RekognitionService } from './rekognition.service';

@Module({
  imports: [ConfigModule],
  providers: [RekognitionService],
  exports: [RekognitionService],
})
export class RekognitionModule {}