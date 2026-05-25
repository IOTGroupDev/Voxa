import { Injectable } from '@nestjs/common';

@Injectable()
export class TimelineService {
  list() {
    // TODO: Compose timeline from MemoryEvents, notes, actions, and daily summaries.
    return [];
  }

  getDailySummary(date: string) {
    return { date, summary: null };
  }
}

