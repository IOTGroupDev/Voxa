import { voxaApi } from '../../api/voxa-api';
import { DongleBackendSyncCoordinator } from './dongle-backend-sync-coordinator';
import { SQLiteDongleBackendSyncQueue } from './dongle-backend-sync-queue';
import { DongleSyncService } from './dongle-sync.service';
import { mockDongleStorageService } from './mock-dongle-storage.service';

export const dongleBackendSyncQueue = new SQLiteDongleBackendSyncQueue();
export const dongleBackendSyncCoordinator = new DongleBackendSyncCoordinator(dongleBackendSyncQueue, voxaApi);
export const mockDongleSyncService = new DongleSyncService(
  mockDongleStorageService,
  voxaApi,
  dongleBackendSyncQueue,
);
