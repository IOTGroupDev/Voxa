import * as SQLite from 'expo-sqlite';
import { RegisterDongleRecordingMetadataDto } from '@voxa/shared';
import { DongleBackendSyncQueue, DongleBackendSyncQueueItem } from './dongle-storage.types';

type DongleBackendSyncQueueRow = {
  id: string;
  device_id: string;
  local_recording_id: string;
  metadata_payload: string;
  created_at: string;
  attempts: number;
  last_error?: string;
};

export class SQLiteDongleBackendSyncQueue implements DongleBackendSyncQueue {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async enqueue(metadata: RegisterDongleRecordingMetadataDto, lastError?: string): Promise<DongleBackendSyncQueueItem> {
    const db = await this.getDb();
    const queuedItem: DongleBackendSyncQueueItem = {
      id: this.createQueueId(metadata.deviceId, metadata.localRecordingId),
      deviceId: metadata.deviceId,
      localRecordingId: metadata.localRecordingId,
      metadataPayload: metadata,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError,
    };

    await db.runAsync(
      `insert into dongle_backend_sync_queue
        (id, device_id, local_recording_id, metadata_payload, created_at, attempts, last_error)
       values (?, ?, ?, ?, ?, ?, ?)
       on conflict(id) do update set
        metadata_payload = excluded.metadata_payload,
        last_error = excluded.last_error`,
      queuedItem.id,
      queuedItem.deviceId,
      queuedItem.localRecordingId,
      JSON.stringify(queuedItem.metadataPayload),
      queuedItem.createdAt,
      queuedItem.attempts,
      queuedItem.lastError ?? null,
    );

    return queuedItem;
  }

  async list(): Promise<DongleBackendSyncQueueItem[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<DongleBackendSyncQueueRow>(
      `select id, device_id, local_recording_id, metadata_payload, created_at, attempts, last_error
       from dongle_backend_sync_queue
       order by created_at asc`,
    );

    return rows.map((row) => ({
      id: row.id,
      deviceId: row.device_id,
      localRecordingId: row.local_recording_id,
      metadataPayload: JSON.parse(row.metadata_payload) as RegisterDongleRecordingMetadataDto,
      createdAt: row.created_at,
      attempts: row.attempts,
      lastError: row.last_error,
    }));
  }

  async countPending(): Promise<number> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      `select count(*) as count from dongle_backend_sync_queue`,
    );
    return row?.count ?? 0;
  }

  async markAttempt(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`update dongle_backend_sync_queue set attempts = attempts + 1 where id = ?`, id);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`update dongle_backend_sync_queue set last_error = ? where id = ?`, error, id);
  }

  async remove(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`delete from dongle_backend_sync_queue where id = ?`, id);
  }

  async clear(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`delete from dongle_backend_sync_queue`);
  }

  private createQueueId(deviceId: string, localRecordingId: string) {
    return `${deviceId}:${localRecordingId}`;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.openDb();
    }

    return this.dbPromise;
  }

  private async openDb(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync('voxa-memory.db');
    await db.execAsync(`
      create table if not exists dongle_backend_sync_queue (
        id text primary key not null,
        device_id text not null,
        local_recording_id text not null,
        metadata_payload text not null,
        created_at text not null,
        attempts integer not null default 0,
        last_error text
      );

      create index if not exists dongle_backend_sync_queue_created_at_idx
        on dongle_backend_sync_queue(created_at);

      create index if not exists dongle_backend_sync_queue_attempts_idx
        on dongle_backend_sync_queue(attempts);
    `);
    return db;
  }
}
