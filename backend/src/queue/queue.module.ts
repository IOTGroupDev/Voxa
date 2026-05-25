import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.RECORDING_UPLOADED },
      { name: QUEUE_NAMES.TRANSCRIPTION },
      { name: QUEUE_NAMES.CLASSIFICATION },
      { name: QUEUE_NAMES.SUMMARY },
      { name: QUEUE_NAMES.ACTION_EXTRACTION },
      { name: QUEUE_NAMES.REMINDER_SUGGESTION },
      { name: QUEUE_NAMES.EMBEDDING },
      { name: QUEUE_NAMES.TIMELINE_UPDATE },
      { name: QUEUE_NAMES.INSIGHT },
      { name: QUEUE_NAMES.CLEANUP },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
