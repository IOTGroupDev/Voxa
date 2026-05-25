import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { MemoryService } from '../ai/memory.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.TIMELINE_UPDATE)
export class TimelineWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, memoryEventId, userId, noteId, recordingId } = job.data;
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
      where: { id: recordingId },
      data: { status: 'completed' },
    });

    const note = noteId ? await this.prisma.note.findUnique({ where: { id: noteId } }) : null;
    const thread = await this.memoryService.attachEventToThread({
      userId,
      memoryEventId,
      noteId,
      titleHint: note?.title ?? memoryEvent.title,
    });
    const updatedThread = await this.memoryService.updateThreadStatistics(thread.id);

    const completedJob = await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'completed', completedAt: new Date() },
    });

    const insightJob = await this.prisma.aiJob.create({
      data: {
        userId,
        recordingId,
        memoryEventId,
        type: 'insight',
        status: 'pending',
        payload: {
          noteId,
          memoryThreadId: updatedThread.id,
        },
      },
    });
    const queuedJob = await this.queueService.enqueueInsight({
      aiJobId: insightJob.id,
      recordingId,
      memoryEventId,
      userId,
      noteId: noteId ?? '',
      memoryThreadId: updatedThread.id,
    });

    return { dailySummaryId: dailySummary.id, aiJobId: completedJob.id, memoryThreadId: updatedThread.id, queuedJob };
  }
}
