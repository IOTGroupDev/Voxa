export interface LocalUploadQueueItem {
  id: string;
  recordingSessionId: string;
  localUri: string;
  createdAt: string;
  attempts: number;
}

export class LocalUploadQueue {
  private items: LocalUploadQueueItem[] = [];

  enqueue(item: Omit<LocalUploadQueueItem, 'createdAt' | 'attempts'>): LocalUploadQueueItem {
    const queuedItem = {
      ...item,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    this.items.push(queuedItem);
    return queuedItem;
  }

  list(): LocalUploadQueueItem[] {
    return [...this.items];
  }
}

