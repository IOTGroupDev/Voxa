import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { AskQuestionDto, AskService, TranscribeAskAudioDto } from './ask.service';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  ask(@CurrentUser() user: AuthenticatedUser, @Body() dto: AskQuestionDto) {
    return this.askService.answer(user.supabaseUserId, dto);
  }

  @Post('transcribe')
  transcribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: TranscribeAskAudioDto) {
    return this.askService.transcribeQuestion(user.supabaseUserId, dto);
  }
}
