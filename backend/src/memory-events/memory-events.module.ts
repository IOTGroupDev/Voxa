import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { MemoryEventsController } from './memory-events.controller';
import { MemoryEventsService } from './memory-events.service';

@Module({
  imports: [StorageModule],
  controllers: [MemoryEventsController],
  providers: [MemoryEventsService],
})
export class MemoryEventsModule {}
