import { Injectable } from '@nestjs/common';

@Injectable()
export class TranscriptsService {
  createFromRecording(recordingId: string, text: string) {
    // TODO: Persist transcript text and segment metadata.
    return { recordingId, text };
  }
}

