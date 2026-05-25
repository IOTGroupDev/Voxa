export interface LocalMemoryEventDraft {
  id: string;
  createdAt: string;
  title?: string;
  summary?: string;
  localRecordingUri?: string;
  capturePayload?: string;
  syncedAt?: string;
}

export class LocalMemoryCache {
  private drafts: LocalMemoryEventDraft[] = [];

  addDraft(draft: Omit<LocalMemoryEventDraft, 'createdAt'>): LocalMemoryEventDraft {
    const item = {
      ...draft,
      createdAt: new Date().toISOString(),
    };
    this.drafts.unshift(item);
    return item;
  }

  listDrafts(): LocalMemoryEventDraft[] {
    return [...this.drafts];
  }

  markSynced(id: string): void {
    this.drafts = this.drafts.map((draft) =>
      draft.id === id ? { ...draft, syncedAt: new Date().toISOString() } : draft,
    );
  }
}
