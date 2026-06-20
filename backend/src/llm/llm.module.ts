import { Module } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { LlmService } from './llm.service';

@Module({
  providers: [GeminiProvider, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
