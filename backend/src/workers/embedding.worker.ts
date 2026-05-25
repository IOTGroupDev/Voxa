import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingWorker {
  async process(noteId: string) {
    // TODO: Generate pgvector embeddings for note chunks.
    return { noteId, status: 'embedded' };
  }
}

