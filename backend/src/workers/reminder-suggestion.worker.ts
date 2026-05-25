import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.REMINDER_SUGGESTION)
export class ReminderSuggestionWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId, noteId } = job.data;
    if (!noteId) {
      throw new Error('noteId is required for reminder suggestion.');
    }

    await this.markProcessing(aiJobId);
    const reminder = await this.prisma.reminder.create({
      data: {
        userId,
        noteId,
        title: 'Follow up on captured memory',
        remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        source: 'mock',
      },
    });

    const completedJob = await this.markCompleted(aiJobId);
    const embeddingJob = await this.prisma.aiJob.create({
      data: {
        userId,
        recordingId,
        memoryEventId,
        type: 'embedding',
        status: 'pending',
        payload: { noteId },
      },
    });
    const queuedJob = await this.queueService.enqueueEmbedding({
      aiJobId: embeddingJob.id,
      recordingId,
      memoryEventId,
      userId,
      noteId,
    });

    return { reminderId: reminder.id, aiJobId: completedJob.id, queuedJob };
  }

  private markProcessing(aiJobId: string) {
    return this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
    });
  }

  private markCompleted(aiJobId: string) {
    return this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }
}
