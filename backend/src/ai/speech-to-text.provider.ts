import { Injectable } from '@nestjs/common';
import { SpeechToTextProvider, SpeechToTextProviderInput } from './providers';

interface HttpTranscriptionResponse {
  text?: unknown;
  language?: unknown;
}

@Injectable()
export class SpeechToTextProviderFactory {
  create(): SpeechToTextProvider {
    const provider = process.env.STT_PROVIDER ?? process.env.AI_PROVIDER ?? 'mock';

    if (provider === 'http' || provider === 'whisper_http') {
      const endpoint = process.env.STT_HTTP_ENDPOINT;
      if (endpoint) {
        return new HttpSpeechToTextProvider(endpoint);
      }
    }

    return new MockSpeechToTextProvider();
  }
}

export class MockSpeechToTextProvider implements SpeechToTextProvider {
  async transcribe(input: SpeechToTextProviderInput) {
    return {
      text: `TODO: Replace mock transcript with server STT output for ${input.recordingId}.`,
      provider: 'mock',
    };
  }
}

export class HttpSpeechToTextProvider implements SpeechToTextProvider {
  constructor(private readonly endpoint: string) {}

  async transcribe(input: SpeechToTextProviderInput) {
    if (!input.signedUrl || input.signedUrl === 'supabase-storage-not-configured') {
      throw new Error('STT service requires a signed audio URL, but storage is not configured.');
    }

    const response = await fetch(this.endpoint, {
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
    });

    if (!response.ok) {
      throw new Error(`STT service failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as HttpTranscriptionResponse;
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      throw new Error('STT service returned an empty transcript.');
    }

    return {
      text: payload.text,
      language: typeof payload.language === 'string' ? payload.language : undefined,
      provider: 'whisper_http',
    };
  }
}
