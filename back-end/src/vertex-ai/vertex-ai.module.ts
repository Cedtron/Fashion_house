
import { Module } from '@nestjs/common';
import { VertexAiService } from './vertex-ai.service';

@Module({
  providers: [VertexAiService],
  exports: [VertexAiService],
})
export class VertexAiModule {}
