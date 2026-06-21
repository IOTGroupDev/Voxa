import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GenerateAnswerInput, GenerateAnswerResult, LlmProvider } from './llm-provider.interface';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

@Injectable()
export class OpenAiCompatibleProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  private readonly apiKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
  private readonly baseUrl = (process.env.OPENAI_COMPATIBLE_BASE_URL?.trim() || 'https://api.deepseek.com').replace(/\/$/, '');
  private readonly model = process.env.LLM_MODEL?.trim() || 'deepseek-v4-flash';
  private readonly timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 30_000);
  private readonly maxAttempts = Number(process.env.LLM_RETRY_ATTEMPTS ?? 2) + 1;

  constructor() {
    this.logger.log(`OpenAI-compatible provider initialized baseUrl=${this.baseUrl} model=${this.model}`);
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    if (!this.apiKey) {
      this.logger.error('OpenAI-compatible API key is missing');
      throw new ServiceUnavailableException('OpenAI-compatible API key is not configured.');
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await this.requestGenerateAnswer(input, attempt);
      } catch (error) {
        lastError = error;
        if (attempt >= this.maxAttempts || !isRetryableError(error)) {
          break;
        }

        const delayMs = 350 * attempt;
        this.logger.warn(
          `OpenAI-compatible request failed, retrying attempt=${attempt} nextAttempt=${attempt + 1} delayMs=${delayMs} error=${formatError(error)}`,
        );
        await delay(delayMs);
      }
    }

    throw normalizeProviderError(lastError);
  }

  private async requestGenerateAnswer(input: GenerateAnswerInput, attempt: number): Promise<GenerateAnswerResult> {
    const endpoint = `${this.baseUrl}/chat/completions`;
    const startedAt = Date.now();

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
            {
              role: 'system',
              content: input.systemPrompt,
            },
            {
              role: 'user',
              content: `Question:\n${input.question}\n\nMemory context:\n${input.context || 'No matching memory context was found.'}`,
            },
          ],
          temperature: 0.2,
          top_p: 0.8,
          max_tokens: 700,
          stream: false,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      this.logger.error(
        `OpenAI-compatible request unreachable baseUrl=${this.baseUrl} model=${this.model} attempt=${attempt} elapsedMs=${elapsedMs} error=${formatError(error)}`,
      );
      throw error;
    }

    const body = await response.text().catch(() => '');
    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      this.logger.error(
        `OpenAI-compatible request failed baseUrl=${this.baseUrl} model=${this.model} attempt=${attempt} status=${response.status} elapsedMs=${elapsedMs} body=${body.slice(0, 500)}`,
      );
      throw new ProviderHttpError(response.status, parseProviderError(body));
    }

    const payload = parseProviderResponse(body);
    const answer = extractAnswer(payload);
    if (!answer) {
      this.logger.error(
        `OpenAI-compatible provider returned empty answer baseUrl=${this.baseUrl} model=${this.model} attempt=${attempt} elapsedMs=${elapsedMs} body=${body.slice(0, 500)}`,
      );
      throw new ServiceUnavailableException('OpenAI-compatible provider returned an empty answer.');
    }

    this.logger.log(`OpenAI-compatible answer generated model=${this.model} attempt=${attempt} elapsedMs=${elapsedMs}`);
    return { answer };
  }
}

class ProviderHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseProviderResponse(body: string): ChatCompletionResponse {
  try {
    return JSON.parse(body) as ChatCompletionResponse;
  } catch {
    throw new ServiceUnavailableException('OpenAI-compatible provider returned an invalid response.');
  }
}

function extractAnswer(payload: ChatCompletionResponse) {
  const content = payload.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

function parseProviderError(body: string) {
  if (!body.trim()) {
    return 'OpenAI-compatible provider returned an error.';
  }

  try {
    const payload = JSON.parse(body) as ChatCompletionResponse;
    return payload.error?.message ?? body.slice(0, 300);
  } catch {
    return body.slice(0, 300);
  }
}

function isRetryableError(error: unknown) {
  if (error instanceof ProviderHttpError) {
    return error.status === 429 || error.status >= 500;
  }

  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return true;
  }

  if (error instanceof ServiceUnavailableException) {
    return true;
  }

  return error instanceof TypeError;
}

function normalizeProviderError(error: unknown) {
  if (error instanceof ProviderHttpError) {
    return new ServiceUnavailableException(`OpenAI-compatible provider error: ${error.message}`);
  }

  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return new ServiceUnavailableException('OpenAI-compatible provider request timed out.');
  }

  if (error instanceof ServiceUnavailableException) {
    return error;
  }

  return new ServiceUnavailableException(`OpenAI-compatible provider request failed: ${formatError(error)}`);
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
