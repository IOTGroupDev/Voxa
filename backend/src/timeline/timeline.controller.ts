import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { TimelineService } from './timeline.service';

@Controller()
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get('timeline')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.timelineService.list(user.supabaseUserId);
  }

  @Get('daily-summary/:date')
  getDailySummary(@CurrentUser() user: AuthenticatedUser, @Param('date') date: string) {
    return this.timelineService.getDailySummary(user.supabaseUserId, date);
  }
}
