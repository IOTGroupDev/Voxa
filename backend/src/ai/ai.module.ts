import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { SpeechToTextProviderFactory } from './speech-to-text.provider';

@Module({
  imports: [QueueModule],
  controllers: [AiController],
  providers: [AiService, MemoryService, SpeechToTextProviderFactory],
  exports: [AiService, MemoryService, SpeechToTextProviderFactory],
})
export class AiModule {}
