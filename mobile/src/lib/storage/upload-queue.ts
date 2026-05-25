import * as SQLite from 'expo-sqlite';

export interface LocalUploadQueueItem {
  id: string;
  recordingSessionId: string;
  localUri: string;
  createdAt: string;
  attempts: number;
}

type UploadQueueRow = {
  id: string;
  recording_session_id: string;
  local_uri: string;
  created_at: string;
  attempts: number;
};

export interface UploadQueue {
  enqueue(item: Omit<LocalUploadQueueItem, 'createdAt' | 'attempts'>): Promise<LocalUploadQueueItem>;
  list(): Promise<LocalUploadQueueItem[]>;
  countPending(): Promise<number>;
  markAttempt(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}

export class SQLiteUploadQueue implements UploadQueue {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async enqueue(item: Omit<LocalUploadQueueItem, 'createdAt' | 'attempts'>): Promise<LocalUploadQueueItem> {
    const db = await this.getDb();
    const queuedItem = {
      ...item,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    await db.runAsync(
      `insert into local_upload_queue
        (id, recording_session_id, local_uri, created_at, attempts)
       values (?, ?, ?, ?, ?)
       on conflict(id) do update set
        recording_session_id = excluded.recording_session_id,
        local_uri = excluded.local_uri,
        created_at = excluded.created_at,
        attempts = excluded.attempts`,
      queuedItem.id,
      queuedItem.recordingSessionId,
      queuedItem.localUri,
      queuedItem.createdAt,
      queuedItem.attempts,
    );

    return queuedItem;
  }

  async list(): Promise<LocalUploadQueueItem[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<UploadQueueRow>(
      `select id, recording_session_id, local_uri, created_at, attempts
       from local_upload_queue
       order by created_at asc`,
    );

    return rows.map((row) => ({
      id: row.id,
      recordingSessionId: row.recording_session_id,
      localUri: row.local_uri,
      createdAt: row.created_at,
      attempts: row.attempts,
    }));
  }

  async countPending(): Promise<number> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      `select count(*) as count from local_upload_queue`,
    );
    return row?.count ?? 0;
  }

  async markAttempt(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`update local_upload_queue set attempts = attempts + 1 where id = ?`, id);
  }

  async remove(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`delete from local_upload_queue where id = ?`, id);
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
      create table if not exists local_upload_queue (
        id text primary key not null,
        recording_session_id text not null,
        local_uri text not null,
        created_at text not null,
        attempts integer not null default 0
      );

      create index if not exists local_upload_queue_created_at_idx
        on local_upload_queue(created_at);

      create index if not exists local_upload_queue_attempts_idx
        on local_upload_queue(attempts);
    `);
    return db;
  }
}
