import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { InboxService } from './inbox.service';

@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  getInbox(@CurrentUser() user: AuthenticatedUser) {
    return this.inboxService.getInbox(user.supabaseUserId);
  }

  @Post('suggestions/generate')
  generate(@CurrentUser() user: AuthenticatedUser) {
    return this.inboxService.generateSuggestions(user.supabaseUserId, user.email);
  }

  @Post('suggestions/:id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inboxService.updateSuggestionStatus(user.supabaseUserId, id, 'accepted');
  }

  @Post('suggestions/:id/dismiss')
  dismiss(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inboxService.updateSuggestionStatus(user.supabaseUserId, id, 'dismissed');
  }

  @Post('suggestions/:id/done')
  done(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inboxService.updateSuggestionStatus(user.supabaseUserId, id, 'done');
  }
}
