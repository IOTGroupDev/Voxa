import * as SQLite from 'expo-sqlite';
import { LocalMemoryEventDraft } from '../memory/local-memory-cache';

export interface SQLiteMemoryStore {
  saveDraft(draft: LocalMemoryEventDraft): Promise<void>;
  listDrafts(): Promise<LocalMemoryEventDraft[]>;
  markSynced(id: string): Promise<void>;
}

type DraftRow = {
  id: string;
  created_at: string;
  title: string | null;
  summary: string | null;
  local_recording_uri: string | null;
  synced_at: string | null;
};

export class ExpoSQLiteMemoryStore implements SQLiteMemoryStore {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async saveDraft(draft: LocalMemoryEventDraft): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `insert into local_memory_event_drafts
        (id, created_at, title, summary, local_recording_uri, synced_at)
       values (?, ?, ?, ?, ?, ?)
       on conflict(id) do update set
        created_at = excluded.created_at,
        title = excluded.title,
        summary = excluded.summary,
        local_recording_uri = excluded.local_recording_uri,
        synced_at = excluded.synced_at`,
      draft.id,
      draft.createdAt,
      draft.title ?? null,
      draft.summary ?? null,
      draft.localRecordingUri ?? null,
      draft.syncedAt ?? null,
    );
  }

  async listDrafts(): Promise<LocalMemoryEventDraft[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<DraftRow>(
      `select id, created_at, title, summary, local_recording_uri, synced_at
       from local_memory_event_drafts
       order by created_at desc`,
    );

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      title: row.title ?? undefined,
      summary: row.summary ?? undefined,
      localRecordingUri: row.local_recording_uri ?? undefined,
      syncedAt: row.synced_at ?? undefined,
    }));
  }

  async markSynced(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `update local_memory_event_drafts set synced_at = ? where id = ?`,
      new Date().toISOString(),
      id,
    );
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
      create table if not exists local_memory_event_drafts (
        id text primary key not null,
        created_at text not null,
        title text,
        summary text,
        local_recording_uri text,
        synced_at text
      );

      create index if not exists local_memory_event_drafts_created_at_idx
        on local_memory_event_drafts(created_at);

      create index if not exists local_memory_event_drafts_synced_at_idx
        on local_memory_event_drafts(synced_at);
    `);
    return db;
  }
}
