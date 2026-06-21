import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { GenerateAnswerInput, GenerateAnswerResult, LlmProvider } from './llm-provider.interface';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider!: LlmProvider;

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly openAiCompatibleProvider: OpenAiCompatibleProvider,
  ) {
    const providerName = process.env.LLM_PROVIDER?.trim() || 'gemini';

    if (providerName === 'gemini') {
      this.provider = this.geminiProvider;
      this.logger.log(`LLM provider selected provider=${providerName}`);
      return;
    }

    if (providerName === 'openai_compatible') {
      this.provider = this.openAiCompatibleProvider;
      this.logger.log(`LLM provider selected provider=${providerName}`);
      return;
    }

    this.logger.error(`Unsupported LLM provider provider=${providerName}`);
    throw new ServiceUnavailableException(`Unsupported LLM provider: ${providerName}`);
  }

  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    return this.provider.generateAnswer(input);
  }
}
