import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { MemoryService } from '../ai/memory.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.TIMELINE_UPDATE)
export class TimelineWorker extends WorkerHost {
  private readonly logger = new Logger(TimelineWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, memoryEventId, userId, noteId, recordingId } = job.data;
    this.logger.log(
      `Timeline update started queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} memoryEventId=${memoryEventId} noteId=${noteId ?? 'none'}`,
    );
    await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
    });

    const memoryEvent = await this.prisma.memoryEvent.findUniqueOrThrow({
      where: { id: memoryEventId },
    });
    const day = new Date(memoryEvent.occurredAt);
    day.setUTCHours(0, 0, 0, 0);

    const note = noteId ? await this.prisma.note.findUnique({ where: { id: noteId } }) : null;
    const summary = createDailySummary(note?.summary ?? note?.body ?? memoryEvent.summary ?? memoryEvent.title);

    const dailySummary = await this.prisma.dailySummary.upsert({
      where: {
        userId_date: {
          userId,
          date: day,
        },
      },
      update: {
        summary,
      },
      create: {
        userId,
        date: day,
        summary,
      },
    });

    await this.prisma.recording.update({
      where: { id: recordingId },
      data: { status: 'completed' },
    });

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

    this.logger.log(
      `Timeline update completed queueJobId=${job.id} aiJobId=${completedJob.id} dailySummaryId=${dailySummary.id} memoryThreadId=${updatedThread.id}`,
    );

    return { dailySummaryId: dailySummary.id, aiJobId: completedJob.id, memoryThreadId: updatedThread.id };
  }
}

function createDailySummary(text?: string | null) {
  const normalized = text?.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return 'Captured memories for this day.';
  }

  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}
