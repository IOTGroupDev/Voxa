import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.TIMELINE_UPDATE)
export class TimelineWorker extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, memoryEventId, userId } = job.data;
    await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
    });

    const memoryEvent = await this.prisma.memoryEvent.findUniqueOrThrow({
      where: { id: memoryEventId },
    });
    const day = new Date(memoryEvent.occurredAt);
    day.setUTCHours(0, 0, 0, 0);

    const dailySummary = await this.prisma.dailySummary.upsert({
      where: {
        userId_date: {
          userId,
          date: day,
        },
      },
      update: {
        summary: 'TODO: Replace with DailySummary provider output.',
      },
      create: {
        userId,
        date: day,
        summary: 'TODO: Replace with DailySummary provider output.',
      },
    });

    await this.prisma.recording.update({
      where: { id: job.data.recordingId },
      data: { status: 'completed' },
    });

    const completedJob = await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'completed', completedAt: new Date() },
    });

    return { dailySummaryId: dailySummary.id, aiJobId: completedJob.id };
  }
}
