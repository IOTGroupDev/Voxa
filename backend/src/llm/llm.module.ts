import { Module } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { LlmService } from './llm.service';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

@Module({
  providers: [GeminiProvider, OpenAiCompatibleProvider, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
