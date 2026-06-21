import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GenerateAnswerInput, GenerateAnswerResult, LlmProvider } from './llm-provider.interface';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface GeminiErrorDetails {
  code?: number;
  message: string;
  status?: string;
  isUnsupportedLocation: boolean;
}

@Injectable()
export class GeminiProvider implements LlmProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey = process.env.GEMINI_API_KEY?.trim();
  private readonly model = process.env.LLM_MODEL?.trim() || 'gemini-2.5-flash';
  private readonly timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 30_000);
  private readonly maxAttempts = Number(process.env.LLM_RETRY_ATTEMPTS ?? 2) + 1;

  constructor() {
    this.logger.log('Gemini provider initialized');
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    if (!this.apiKey) {
      this.logger.error('Gemini API key is missing');
      throw new ServiceUnavailableException('Gemini API key is not configured.');
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
          `Gemini request failed, retrying attempt=${attempt} nextAttempt=${attempt + 1} delayMs=${delayMs} error=${formatError(error)}`,
        );
        await delay(delayMs);
      }
    }

    throw normalizeGeminiError(lastError);
  }

  private async requestGenerateAnswer(input: GenerateAnswerInput, attempt: number): Promise<GenerateAnswerResult> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': this.apiKey ?? '',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: input.systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Question:\n${input.question}\n\nMemory context:\n${input.context || 'No matching memory context was found.'}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 700,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      this.logger.error(
        `Gemini request unreachable model=${this.model} attempt=${attempt} elapsedMs=${elapsedMs} error=${formatError(error)}`,
      );
      throw error;
    }

    const body = await response.text().catch(() => '');
    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      const details = parseGeminiError(body);
      if (details.isUnsupportedLocation) {
        this.logger.error(
          `Gemini request blocked by API location policy model=${this.model} attempt=${attempt} status=${response.status} apiStatus=${details.status ?? 'unknown'} elapsedMs=${elapsedMs}`,
        );
      } else {
        this.logger.error(
          `Gemini request failed model=${this.model} attempt=${attempt} status=${response.status} apiStatus=${details.status ?? 'unknown'} elapsedMs=${elapsedMs} body=${body.slice(0, 500)}`,
        );
      }
      throw new GeminiHttpError(response.status, details);
    }

    const payload = parseGeminiResponse(body);
    const answer = extractGeminiAnswer(payload);
    if (!answer) {
      this.logger.error(
        `Gemini returned empty answer model=${this.model} attempt=${attempt} elapsedMs=${elapsedMs} body=${body.slice(0, 500)}`,
      );
      throw new ServiceUnavailableException('Gemini returned an empty answer.');
    }

    this.logger.log(`Gemini answer generated model=${this.model} attempt=${attempt} elapsedMs=${elapsedMs}`);
    return { answer };
  }
}

class GeminiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly details: GeminiErrorDetails,
  ) {
    super(details.message);
  }
}

function parseGeminiResponse(body: string): GeminiGenerateContentResponse {
  try {
    return JSON.parse(body) as GeminiGenerateContentResponse;
  } catch {
    throw new ServiceUnavailableException('Gemini returned an invalid response.');
  }
}

function extractGeminiAnswer(payload: GeminiGenerateContentResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function parseGeminiError(body: string): GeminiErrorDetails {
  if (!body.trim()) {
    return {
      message: 'Gemini API returned an error.',
      isUnsupportedLocation: false,
    };
  }

  try {
    const payload = JSON.parse(body) as GeminiGenerateContentResponse;
    const message = payload.error?.message ?? body.slice(0, 300);
    const status = payload.error?.status;
    return {
      code: payload.error?.code,
      message,
      status,
      isUnsupportedLocation:
        status === 'FAILED_PRECONDITION' && /location is not supported|unsupported.*location/i.test(message),
    };
  } catch {
    return {
      message: body.slice(0, 300),
      isUnsupportedLocation: /location is not supported|unsupported.*location/i.test(body),
    };
  }
}

function isRetryableError(error: unknown) {
  if (error instanceof GeminiHttpError) {
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

function normalizeGeminiError(error: unknown) {
  if (error instanceof GeminiHttpError) {
    if (error.details.isUnsupportedLocation) {
      return new ServiceUnavailableException(
        'Gemini API is not available from the current backend location. Run Voxa backend from a supported region or configure another LLM provider.',
      );
    }

    return new ServiceUnavailableException(`Gemini API error: ${error.message}`);
  }

  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return new ServiceUnavailableException('Gemini request timed out.');
  }

  if (error instanceof ServiceUnavailableException) {
    return error;
  }

  return new ServiceUnavailableException(`Gemini request failed: ${formatError(error)}`);
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
