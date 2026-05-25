import { Injectable } from '@nestjs/common';

@Injectable()
export class TranscriptionWorker {
  async process(recordingId: string) {
    // TODO: Pull private audio from storage and call SpeechToTextProvider.
    return { recordingId, status: 'transcript_created' };
  }
}

