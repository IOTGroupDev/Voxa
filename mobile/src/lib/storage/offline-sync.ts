import { CaptureSource } from '@voxa/shared';
import { voxaApi } from '../api/voxa-api';
import { SQLiteMemoryStore } from './sqlite-memory-store';
import { UploadQueue } from './upload-queue';

export interface OfflineSyncResult {
  attempted: number;
  completed: number;
  failed: number;
}

export class OfflineSyncCoordinator {
  constructor(
    private readonly uploadQueue: UploadQueue,
    private readonly memoryStore: SQLiteMemoryStore,
  ) {}

  async retryPendingUploads(): Promise<OfflineSyncResult> {
    const items = await this.uploadQueue.list();
    let completed = 0;
    let failed = 0;

    for (const item of items) {
      await this.uploadQueue.markAttempt(item.id);

      try {
        const recording = await voxaApi.createRecording({
          source: CaptureSource.MOBILE_APP,
          mimeType: 'audio/mp4',
        });
        await voxaApi.createRecordingUploadUrl(recording.id);
        // TODO: Upload item.localUri to Supabase signed URL when real audio files are wired.
        await this.memoryStore.markSynced(item.recordingSessionId);
        await this.uploadQueue.remove(item.id);
        completed += 1;
      } catch {
        failed += 1;
      }
    }

    return {
      attempted: items.length,
      completed,
      failed,
    };
  }
}
