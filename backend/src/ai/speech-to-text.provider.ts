import { Injectable, Logger } from '@nestjs/common';
import { SpeechToTextProvider, SpeechToTextProviderInput } from './providers';

interface HttpTranscriptionResponse {
  text?: unknown;
  language?: unknown;
}

@Injectable()
export class SpeechToTextProviderFactory {
  private readonly logger = new Logger(SpeechToTextProviderFactory.name);

  create(): SpeechToTextProvider {
    const provider = process.env.STT_PROVIDER ?? 'http';

    if (provider === 'http' || provider === 'whisper_http') {
      const endpoint = process.env.STT_HTTP_ENDPOINT;
      if (endpoint) {
        this.logger.log(`Using HTTP STT provider endpoint=${endpoint}`);
        return new HttpSpeechToTextProvider(endpoint);
      }

      throw new Error('STT_HTTP_ENDPOINT is required for speech-to-text.');
    }

    throw new Error(`Unsupported STT_PROVIDER: ${provider}.`);
  }
}

export class HttpSpeechToTextProvider implements SpeechToTextProvider {
  private readonly logger = new Logger(HttpSpeechToTextProvider.name);

  constructor(private readonly endpoint: string) {}

  async transcribe(input: SpeechToTextProviderInput) {
    if (!input.signedUrl) {
      throw new Error('STT service requires a signed audio URL, but storage is not configured.');
    }

    const startedAt = Date.now();
    this.logger.log(`STT request started recordingId=${input.recordingId} endpoint=${this.endpoint}`);
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          recordingId: input.recordingId,
          storagePath: input.storagePath,
          signedUrl: input.signedUrl,
          mimeType: input.mimeType,
          durationMs: input.durationMs,
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      const message = formatSttNetworkError(error);
      this.logger.error(
        `STT request could not reach service recordingId=${input.recordingId} endpoint=${this.endpoint} error=${message}`,
      );
      throw new Error(`STT service is unreachable at ${this.endpoint}: ${message}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `STT request failed recordingId=${input.recordingId} status=${response.status} body=${body.slice(0, 300)}`,
      );
      throw new Error(`STT service failed with status ${response.status}: ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as HttpTranscriptionResponse;
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      this.logger.error(`STT request returned empty transcript recordingId=${input.recordingId}`);
      throw new Error('STT service returned an empty transcript.');
    }
    this.logger.log(
      `STT request completed recordingId=${input.recordingId} language=${typeof payload.language === 'string' ? payload.language : 'unknown'} durationMs=${Date.now() - startedAt}`,
    );

    return {
      text: payload.text,
      language: typeof payload.language === 'string' ? payload.language : undefined,
      provider: 'whisper_http',
    };
  }
}

function formatSttNetworkError(error: unknown) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` cause=${error.cause.message}` : '';
    return `${error.message}${cause}`;
  }

  return 'unknown network error';
}
