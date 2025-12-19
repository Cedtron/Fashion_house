
import { Module } from '@nestjs/common';
import { GoogleAiService } from './vertex-ai.service';

@Module({
  providers: [GoogleAiService],
  exports: [GoogleAiService],
})
export class GoogleAiModule {}
