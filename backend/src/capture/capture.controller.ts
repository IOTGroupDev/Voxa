import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { CompleteCaptureSessionDto, CreateCaptureSessionDto } from '@voxa/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { CaptureService } from './capture.service';

@Controller('capture')
export class CaptureController {
  constructor(private readonly captureService: CaptureService) {}

  @Post('session')
  createSession(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCaptureSessionDto) {
    return this.captureService.createSession(user.supabaseUserId, user.email, dto);
  }

  @Patch('session/:id/complete')
  completeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteCaptureSessionDto,
  ) {
    return this.captureService.completeSession(user.supabaseUserId, id, dto);
  }

  @Patch('session/:id/cancel')
  cancelSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.captureService.cancelSession(user.supabaseUserId, id);
  }
}
