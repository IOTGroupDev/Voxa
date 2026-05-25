import { Module } from '@nestjs/common';
import { MemoryEventsController } from './memory-events.controller';
import { MemoryEventsService } from './memory-events.service';

@Module({
  controllers: [MemoryEventsController],
  providers: [MemoryEventsService],
})
export class MemoryEventsModule {}

