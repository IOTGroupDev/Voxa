import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface SynthesizeSpeechDto {
  text: string;
  language?: string;
  speaker?: number;
}

interface TtsProviderResponse {
  audioBase64?: unknown;
  mimeType?: unknown;
  provider?: unknown;
  language?: unknown;
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  async synthesize(dto: SynthesizeSpeechDto) {
    const provider = process.env.TTS_PROVIDER?.trim() || 'piper_http';
    if (provider !== 'piper_http') {
      throw new ServiceUnavailableException(`Unsupported TTS provider: ${provider}`);
    }

    const endpoint = process.env.TTS_HTTP_ENDPOINT?.trim();
    if (!endpoint) {
      throw new ServiceUnavailableException('TTS_HTTP_ENDPOINT is not configured.');
    }

    const text = dto.text?.trim();
    if (!text) {
      throw new BadRequestException('text is required.');
    }
    if (text.length > 1200) {
      throw new BadRequestException('text is too long.');
    }

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          language: dto.language,
          speaker: dto.speaker,
        }),
        signal: AbortSignal.timeout(Number(process.env.TTS_TIMEOUT_MS ?? 60_000)),
      });
    } catch (error) {
      this.logger.error(`Piper TTS unreachable endpoint=${endpoint} error=${formatError(error)}`);
      throw new ServiceUnavailableException(`TTS service is unreachable: ${formatError(error)}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `Piper TTS failed endpoint=${endpoint} status=${response.status} elapsedMs=${Date.now() - startedAt} body=${body.slice(0, 300)}`,
      );
      throw new ServiceUnavailableException(`TTS service failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as TtsProviderResponse;
    if (typeof payload.audioBase64 !== 'string' || payload.audioBase64.length === 0) {
      throw new ServiceUnavailableException('TTS service returned empty audio.');
    }

    this.logger.log(`Piper TTS synthesized chars=${text.length} elapsedMs=${Date.now() - startedAt}`);
    return {
      audioBase64: payload.audioBase64,
      mimeType: typeof payload.mimeType === 'string' ? payload.mimeType : 'audio/wav',
      provider: typeof payload.provider === 'string' ? payload.provider : 'piper',
      language: typeof payload.language === 'string' ? payload.language : dto.language,
    };
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
