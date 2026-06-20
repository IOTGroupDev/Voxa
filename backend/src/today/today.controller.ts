import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { TodayDigestService } from './today-digest.service';

interface GenerateDigestDto {
  date?: string;
  regenerate?: boolean;
}

@Controller('today')
export class TodayController {
  constructor(private readonly todayDigestService: TodayDigestService) {}

  @Get('digest')
  getDigest(@CurrentUser() user: AuthenticatedUser, @Query('date') date?: string) {
    return this.todayDigestService.getDigest(user.supabaseUserId, date);
  }

  @Post('digest/generate')
  generateDigest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateDigestDto,
    @Query('date') queryDate?: string,
    @Query('regenerate') queryRegenerate?: string,
  ) {
    return this.todayDigestService.generateDigest(user.supabaseUserId, user.email, {
      date: dto?.date ?? queryDate,
      regenerate: dto?.regenerate ?? queryRegenerate === 'true',
    });
  }
}
