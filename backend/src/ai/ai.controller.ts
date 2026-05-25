import { Controller, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('reprocess/:recordingId')
  reprocessRecording(@Param('recordingId') recordingId: string) {
    return this.aiService.reprocessRecording(recordingId);
  }

  @Post('reprocess-event/:eventId')
  reprocessEvent(@Param('eventId') eventId: string) {
    return this.aiService.reprocessEvent(eventId);
  }
}

