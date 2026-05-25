import { OfflineSyncCoordinator } from './offline-sync';
import { ExpoSQLiteMemoryStore } from './sqlite-memory-store';
import { SQLiteUploadQueue } from './upload-queue';

export const localUploadQueue = new SQLiteUploadQueue();
export const sqliteMemoryStore = new ExpoSQLiteMemoryStore();
export const offlineSyncCoordinator = new OfflineSyncCoordinator(localUploadQueue, sqliteMemoryStore);
