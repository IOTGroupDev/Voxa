import { Injectable } from '@nestjs/common';

@Injectable()
export class TimelineWorker {
  async process(memoryEventId: string) {
    // TODO: Update timeline and daily summary projections.
    return { memoryEventId, status: 'timeline_updated' };
  }
}

