import { voxaApi } from '../../api/voxa-api';
import { DongleBackendSyncCoordinator } from './dongle-backend-sync-coordinator';
import { SQLiteDongleBackendSyncQueue } from './dongle-backend-sync-queue';

export const dongleBackendSyncQueue = new SQLiteDongleBackendSyncQueue();
export const dongleBackendSyncCoordinator = new DongleBackendSyncCoordinator(dongleBackendSyncQueue, voxaApi);
