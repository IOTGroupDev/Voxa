import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { GenerateAnswerInput, GenerateAnswerResult, LlmProvider } from './llm-provider.interface';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { OpenAiProvider } from './openai.provider';
import { EmptyAiAnswerError, ProviderRegionBlockedError, MalformedJsonError } from './errors';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly geminiProvider: GeminiProvider;
  private readonly openAiCompatibleProvider: OpenAiCompatibleProvider;
  private readonly openAiProvider: OpenAiProvider;

  constructor(
    geminiProvider: GeminiProvider,
    openAiCompatibleProvider: OpenAiCompatibleProvider,
    openAiProvider: OpenAiProvider,
  ) {
    this.geminiProvider = geminiProvider;
    this.openAiCompatibleProvider = openAiCompatibleProvider;
    this.openAiProvider = openAiProvider;

    // Backwards compatibility: map legacy LLM_MODEL into provider-specific env vars when appropriate
    const legacyModel = process.env.LLM_MODEL?.trim();
    if (legacyModel) {
      if (!process.env.GEMINI_MODEL && /^gemini-/i.test(legacyModel)) {
        process.env.GEMINI_MODEL = legacyModel;
        this.logger.log(`Mapped legacy LLM_MODEL to GEMINI_MODEL=${legacyModel}`);
      }

      if (!process.env.DEEPSEEK_MODEL && /deepseek|deepseek-/i.test(legacyModel)) {
        process.env.DEEPSEEK_MODEL = legacyModel;
        this.logger.log(`Mapped legacy LLM_MODEL to DEEPSEEK_MODEL=${legacyModel}`);
      }

      if (!process.env.OPENAI_MODEL && /gpt|gpt-/.test(legacyModel)) {
        process.env.OPENAI_MODEL = legacyModel;
        this.logger.log(`Mapped legacy LLM_MODEL to OPENAI_MODEL=${legacyModel}`);
      }
    }

    const orderEnv = process.env.LLM_PROVIDER_ORDER?.trim() || 'gemini,deepseek,openai,local';
    this.logger.log(`LLM service initialized provider order=${orderEnv}`);
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    const order = process.env.LLM_PROVIDER_ORDER?.split(',').map((s) => s.trim()) ?? ['gemini', 'deepseek', 'openai', 'local'];

    for (const name of order) {
      if (name === 'local') break; // local fallback handled after providers

      let providerInstance: LlmProvider | null = null;
      let meta = '';

      if (name === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
        if (!apiKey || !model.startsWith('gemini-')) {
          this.logger.warn(`Skipping GeminiProvider: GEMINI_API_KEY or valid GEMINI_MODEL not configured model=${model}`);
          continue;
        }
        providerInstance = this.geminiProvider;
        meta = `model=${model}`;
      }

      if (name === 'deepseek' || name === 'openai_compatible') {
        const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENAI_COMPATIBLE_API_KEY?.trim();
        const baseUrl = process.env.DEEPSEEK_BASE_URL?.trim() || process.env.OPENAI_COMPATIBLE_BASE_URL?.trim() || 'https://api.deepseek.com';
        const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat';
        if (!apiKey) {
          this.logger.warn('Skipping OpenAiCompatibleProvider: DEEPSEEK_API_KEY is not configured');
          continue;
        }
        providerInstance = this.openAiCompatibleProvider;
        meta = `baseUrl=${baseUrl} model=${model}`;
      }

      if (name === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
        if (!apiKey) {
          this.logger.warn('Skipping OpenAiProvider: OPENAI_API_KEY is not configured');
          continue;
        }
        providerInstance = this.openAiProvider;
        meta = `model=${model}`;
      }

      if (!providerInstance) continue;

      const providerName = providerInstance.constructor?.name ?? name;
      const startedAt = Date.now();
      this.logger.log(`Attempting LLM provider=${providerName} ${meta}`);

      try {
        const result = await providerInstance.generateAnswer(input);
        const elapsed = Date.now() - startedAt;
        this.logger.log(`LLM provider success provider=${providerName} elapsedMs=${elapsed} responseSize=${result.answer?.length ?? 0}`);
        return result;
      } catch (err) {
        const elapsed = Date.now() - startedAt;
        this.logger.warn(`LLM provider failed provider=${providerName} elapsedMs=${elapsed} error=${err instanceof Error ? err.message : String(err)}`);
        // continue to next provider for supported error types
        continue;
      }
    }

    // local fallback
    this.logger.warn('All LLM providers failed or were skipped, generating local fallback suggestions');
    const fallback = this.generateLocalFallback(input);
    return { answer: fallback };
  }

  private generateLocalFallback(input: GenerateAnswerInput): string {
    const text = `${input.question}\n${input.context || ''}`.toLowerCase();
    const keywords = ['надо', 'купить', 'проверить', 'позвонить', 'встреча', 'стоматолог', 'записаться'];
    const found: string[] = [];
    for (const k of keywords) {
      if (text.includes(k)) found.push(k);
    }

    if (found.length === 0) {
      return JSON.stringify({ type: 'attention', items: [{ task: 'review', text: input.question }] });
    }

    const items = found.map((k, i) => ({ id: i + 1, type: 'task', text: `Автоматически обнаружено: ${k}` }));
    return JSON.stringify({ type: 'attention', items });
  }
}
