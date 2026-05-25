import { Injectable } from '@nestjs/common';

@Injectable()
export class SummaryWorker {
  async process(memoryEventId: string) {
    // TODO: Call SummaryProvider and persist Note/Tag records.
    return { memoryEventId, status: 'summary_created' };
  }
}

