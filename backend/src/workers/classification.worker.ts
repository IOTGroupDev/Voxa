import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { MemoryEventType, QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.CLASSIFICATION)
export class ClassificationWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId } = job.data;

    await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    const memoryEvent = await this.prisma.memoryEvent.update({
      where: { id: memoryEventId },
      data: {
        type: MemoryEventType.QUICK_NOTE,
        confidence: 0.5,
      },
    });

    const completedJob = await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    const summaryJob = await this.prisma.aiJob.create({
      data: {
        userId,
        recordingId,
        memoryEventId,
        type: 'summary',
        status: 'pending',
        payload: {
          classifiedType: memoryEvent.type,
        },
      },
    });

    const queuedJob = await this.queueService.enqueueSummary({
      aiJobId: summaryJob.id,
      recordingId,
      memoryEventId,
      userId,
    });

    return { memoryEventId, aiJobId: completedJob.id, queuedJob };
  }
}

