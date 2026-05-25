import { Module } from '@nestjs/common';
import { MemoryThreadsController } from './memory-threads.controller';
import { MemoryThreadsService } from './memory-threads.service';

@Module({
  controllers: [MemoryThreadsController],
  providers: [MemoryThreadsService],
  exports: [MemoryThreadsService],
})
export class MemoryThreadsModule {}

