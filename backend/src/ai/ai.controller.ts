import { Controller, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('reprocess/:recordingId')
  reprocessRecording(@CurrentUser() user: AuthenticatedUser, @Param('recordingId') recordingId: string) {
    return this.aiService.reprocessRecording(user.supabaseUserId, recordingId);
  }

  @Post('reprocess-event/:eventId')
  reprocessEvent(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.aiService.reprocessEvent(user.supabaseUserId, eventId);
  }
}
