import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
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

  @Get('memory/history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to query parameters are required.');
    }

    return this.timelineService.history(user.supabaseUserId, {
      from,
      to,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('daily-summary/:date')
  getDailySummary(@CurrentUser() user: AuthenticatedUser, @Param('date') date: string) {
    return this.timelineService.getDailySummary(user.supabaseUserId, date);
  }
}
