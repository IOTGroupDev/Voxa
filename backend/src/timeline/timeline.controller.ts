import { Controller, Get, Param } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Controller()
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get('timeline')
  list() {
    return this.timelineService.list();
  }

  @Get('daily-summary/:date')
  getDailySummary(@Param('date') date: string) {
    return this.timelineService.getDailySummary(date);
  }
}

