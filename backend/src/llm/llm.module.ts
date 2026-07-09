import { Module } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { LlmService } from './llm.service';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { OpenAiProvider } from './openai.provider';

@Module({
  providers: [GeminiProvider, OpenAiCompatibleProvider, OpenAiProvider, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
