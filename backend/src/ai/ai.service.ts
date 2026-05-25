import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  reprocessRecording(recordingId: string) {
    // TODO: Enqueue transcription/classification/summary pipeline for an existing recording.
    return { recordingId, queued: true };
  }

  reprocessEvent(eventId: string) {
    // TODO: Enqueue downstream AI jobs for a MemoryEvent.
    return { eventId, queued: true };
  }
}

