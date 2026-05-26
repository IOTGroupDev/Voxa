import { CaptureSource, CreateCaptureSessionDto, RecordingStatus } from '@voxa/shared';
import { voxaApi } from '../api/voxa-api';
import { uploadAudioFileToSignedUrl } from './audio-file-upload';
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
        const drafts = await this.memoryStore.listDrafts();
        const matchingDraft = drafts.find((draft) => draft.id === item.recordingSessionId);
        const capturePayload = matchingDraft?.capturePayload
          ? (JSON.parse(matchingDraft.capturePayload) as CreateCaptureSessionDto)
          : null;
        const captureSession = capturePayload
          ? await voxaApi.createCaptureSession(capturePayload)
          : null;
        const recording = await voxaApi.createRecording({
          source: capturePayload?.source ?? CaptureSource.MOBILE_APP,
          deviceId: capturePayload?.deviceId,
          mimeType: 'audio/mp4',
        });
        const upload = await voxaApi.createRecordingUploadUrl(recording.id);
        await uploadAudioFileToSignedUrl(item.localUri, upload);
        await voxaApi.updateRecordingStatus(recording.id, { status: RecordingStatus.UPLOADED });
        if (captureSession) {
          await voxaApi.completeCaptureSession(captureSession.id, {
            recordingId: recording.id,
          });
        }
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
