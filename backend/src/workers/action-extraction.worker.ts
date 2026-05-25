import { Injectable } from '@nestjs/common';

@Injectable()
export class ActionExtractionWorker {
  async process(noteId: string) {
    // TODO: Extract ActionItem candidates from transcript/note text.
    return { noteId, status: 'actions_extracted' };
  }
}

