import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { GenerateAnswerInput, GenerateAnswerResult, LlmProvider } from './llm-provider.interface';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: LlmProvider;

  constructor(private readonly geminiProvider: GeminiProvider) {
    const providerName = process.env.LLM_PROVIDER?.trim() || 'gemini';

    if (providerName !== 'gemini') {
      this.logger.error(`Unsupported LLM provider provider=${providerName}`);
      throw new ServiceUnavailableException(`Unsupported LLM provider: ${providerName}`);
    }

    this.provider = this.geminiProvider;
    this.logger.log(`LLM provider selected provider=${providerName}`);
  }

  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    return this.provider.generateAnswer(input);
  }
}
