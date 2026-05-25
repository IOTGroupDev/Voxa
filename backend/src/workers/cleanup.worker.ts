import { Injectable } from '@nestjs/common';

@Injectable()
export class CleanupWorker {
  async process(recordingId: string) {
    // TODO: Apply user retention settings, including optional audio auto-delete.
    return { recordingId, status: 'cleanup_checked' };
  }
}

