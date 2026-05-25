import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UpdateInsightDto } from '@voxa/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.insightsService.list(user.supabaseUserId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.insightsService.get(user.supabaseUserId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateInsightDto) {
    return this.insightsService.update(user.supabaseUserId, id, dto);
  }
}

