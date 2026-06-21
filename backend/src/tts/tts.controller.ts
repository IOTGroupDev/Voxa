import { Body, Controller, Post } from '@nestjs/common';
import { TtsService, SynthesizeSpeechDto } from './tts.service';

@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('synthesize')
  synthesize(@Body() dto: SynthesizeSpeechDto) {
    return this.ttsService.synthesize(dto);
  }
}
