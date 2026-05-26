import { DongleRecordingSyncStatus } from '@voxa/shared';
import {
  DongleBackendSyncQueue,
  DongleStorageService,
  DongleSyncBackendClient,
  DongleSyncResult,
} from './dongle-storage.types';

const completedStatuses = new Set<DongleRecordingSyncStatus>([
  DongleRecordingSyncStatus.CONFIRMED_BY_BACKEND,
  DongleRecordingSyncStatus.SAFE_TO_DELETE_FROM_DEVICE,
]);

const locallyTransferredStatuses = new Set<DongleRecordingSyncStatus>([
  DongleRecordingSyncStatus.TRANSFERRED_TO_PHONE,
  DongleRecordingSyncStatus.UPLOADED_TO_BACKEND,
]);

export class DongleSyncService {
  constructor(
    private readonly storageService: DongleStorageService,
    private readonly backendClient?: DongleSyncBackendClient,
    private readonly backendSyncQueue?: DongleBackendSyncQueue,
  ) {}

  async syncStoredRecordings(deviceId: string): Promise<DongleSyncResult> {
    const manifest = await this.storageService.listStoredRecordings(deviceId);
    let transferredRecordings = 0;
    let failedRecordings = 0;
    let backendSyncedRecordings = 0;
    let backendFailedRecordings = 0;
    let lastError: string | undefined;

    for (const item of manifest) {
      if (completedStatuses.has(item.syncStatus)) {
        continue;
      }

      try {
        if (!locallyTransferredStatuses.has(item.syncStatus)) {
          await this.transferRecording(deviceId, item.localRecordingId);
          transferredRecordings += 1;
        }
      } catch (error) {
        failedRecordings += 1;
        const message = error instanceof Error ? error.message : 'Unknown dongle sync failure';
        lastError = message;
        await this.storageService.markSyncFailed(
          deviceId,
          item.localRecordingId,
          message,
        );
        await this.markBackendSyncFailed(deviceId, item.localRecordingId, message);
        continue;
      }

      try {
        await this.syncBackendMetadata(deviceId, item.localRecordingId);
        backendSyncedRecordings += this.backendClient ? 1 : 0;
      } catch (error) {
        backendFailedRecordings += 1;
        lastError = error instanceof Error ? error.message : 'Unknown backend sync failure';
        await this.enqueueBackendSync(deviceId, item.localRecordingId, lastError);
      }
    }

    return {
      deviceId,
      attemptedRecordings: manifest.length,
      transferredRecordings,
      failedRecordings,
      backendSyncedRecordings,
      backendFailedRecordings,
      finalStatus:
        failedRecordings > 0
          ? DongleRecordingSyncStatus.SYNC_FAILED
          : DongleRecordingSyncStatus.TRANSFERRED_TO_PHONE,
      error: lastError,
    };
  }

  private async syncBackendMetadata(deviceId: string, localRecordingId: string) {
    if (!this.backendClient) {
      return;
    }

    const metadata = await this.storageService.fetchRecordingMetadata(deviceId, localRecordingId);
    if (!metadata) {
      throw new Error('Dongle recording metadata missing.');
    }

    await this.backendClient.registerDongleRecordingMetadata(metadata);
    await this.backendClient.updateDongleRecordingSyncStatus({
      deviceId,
      localRecordingId,
      syncStatus: DongleRecordingSyncStatus.TRANSFERRED_TO_PHONE,
    });
  }

  private async markBackendSyncFailed(deviceId: string, localRecordingId: string, error: string) {
    if (!this.backendClient) {
      return;
    }

    try {
      await this.backendClient.updateDongleRecordingSyncStatus({
        deviceId,
        localRecordingId,
        syncStatus: DongleRecordingSyncStatus.SYNC_FAILED,
        error,
      });
    } catch {
      // Local failure state is authoritative until backend connectivity returns.
    }
  }

  private async enqueueBackendSync(deviceId: string, localRecordingId: string, error: string) {
    if (!this.backendSyncQueue) {
      return;
    }

    const metadata = await this.storageService.fetchRecordingMetadata(deviceId, localRecordingId);
    if (metadata) {
      await this.backendSyncQueue.enqueue(metadata, error);
    }
  }

  private async transferRecording(deviceId: string, localRecordingId: string) {
    const firstChunk = await this.storageService.requestAudioChunk(deviceId, localRecordingId, 0);
    if (!firstChunk) {
      throw new Error('Dongle recording chunk missing.');
    }

    await this.storageService.confirmChunkReceived(deviceId, localRecordingId, firstChunk);

    for (let chunkIndex = 1; chunkIndex < firstChunk.totalChunks; chunkIndex += 1) {
      const chunk = await this.storageService.requestAudioChunk(deviceId, localRecordingId, chunkIndex);
      if (!chunk) {
        throw new Error(`Dongle recording chunk ${chunkIndex} missing.`);
      }
      await this.storageService.confirmChunkReceived(deviceId, localRecordingId, chunk);
    }

    await this.storageService.markRecordingTransferred(deviceId, localRecordingId);
  }
}
