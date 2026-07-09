import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GenerateAnswerInput, GenerateAnswerResult, LlmProvider } from './llm-provider.interface';
import { EmptyAiAnswerError, MalformedJsonError } from './errors';

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: string };
}

@Injectable()
export class OpenAiProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiKey = process.env.OPENAI_API_KEY?.trim();
  private readonly baseUrl = (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com').replace(/\/$/, '');
  private readonly model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  private readonly timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 30_000);

  constructor() {
    this.logger.log(`OpenAI provider initialized baseUrl=${this.baseUrl} model=${this.model}`);
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    if (!this.apiKey) {
      this.logger.error('OpenAI API key is missing');
      throw new ServiceUnavailableException('OpenAI API key is not configured.');
    }

    const startedAt = Date.now();
    const endpoint = `${this.baseUrl}/v1/chat/completions`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: `Question:\n${input.question}\n\nMemory context:\n${input.context || 'No matching memory context was found.'}` },
          ],
          temperature: 0.2,
          max_tokens: 700,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      this.logger.error(`OpenAI request failed to reach baseUrl=${this.baseUrl} model=${this.model} error=${String(err)}`);
      throw err;
    }

    const body = await response.text().catch(() => '');
    const elapsedMs = Date.now() - startedAt;
    if (!response.ok) {
      this.logger.error(`OpenAI request failed status=${response.status} elapsedMs=${elapsedMs} body=${body.slice(0, 500)}`);
      throw new ServiceUnavailableException('OpenAI returned an error');
    }

    let payload: OpenAiChatResponse;
    try {
      payload = JSON.parse(body) as OpenAiChatResponse;
    } catch {
      this.logger.error(`OpenAI returned malformed JSON model=${this.model} elapsedMs=${elapsedMs} responseSize=${body.length}`);
      throw new MalformedJsonError();
    }

    const content = payload.choices?.[0]?.message?.content;
    const answer = typeof content === 'string' ? content.trim() : '';
    if (!answer) {
      this.logger.error(`OpenAI returned empty content model=${this.model} elapsedMs=${elapsedMs} responseSize=${body.length}`);
      throw new EmptyAiAnswerError();
    }

    this.logger.log(`OpenAI answer generated model=${this.model} elapsedMs=${elapsedMs} responseSize=${body.length}`);
    return { answer };
  }
}
