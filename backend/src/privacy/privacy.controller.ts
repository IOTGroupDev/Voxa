import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdatePrivacySettingsDto } from '@voxa/shared';
import { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrivacyService } from './privacy.service';

@Controller('settings/privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.privacyService.getSettings(user.supabaseUserId, user.email);
  }

  @Patch()
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePrivacySettingsDto) {
    return this.privacyService.updateSettings(user.supabaseUserId, user.email, dto);
  }
}
