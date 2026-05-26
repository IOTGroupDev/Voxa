import { DongleRecordingSyncStatus } from '@voxa/shared';
import { DongleBackendSyncQueue, DongleSyncBackendClient } from './dongle-storage.types';

export interface DongleBackendSyncRetryResult {
  attempted: number;
  completed: number;
  failed: number;
}

export class DongleBackendSyncCoordinator {
  constructor(
    private readonly queue: DongleBackendSyncQueue,
    private readonly backendClient: DongleSyncBackendClient,
  ) {}

  async retryPendingBackendSync(): Promise<DongleBackendSyncRetryResult> {
    const items = await this.queue.list();
    let completed = 0;
    let failed = 0;

    for (const item of items) {
      await this.queue.markAttempt(item.id);

      try {
        await this.backendClient.registerDongleRecordingMetadata(item.metadataPayload);
        await this.backendClient.updateDongleRecordingSyncStatus({
          deviceId: item.deviceId,
          localRecordingId: item.localRecordingId,
          syncStatus: DongleRecordingSyncStatus.TRANSFERRED_TO_PHONE,
        });
        await this.queue.remove(item.id);
        completed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown dongle backend sync retry failure';
        await this.queue.markFailed(item.id, message);
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
