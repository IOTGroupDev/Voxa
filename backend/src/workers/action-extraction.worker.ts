import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.ACTION_EXTRACTION)
export class ActionExtractionWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId, noteId } = job.data;
    if (!noteId) {
      throw new Error('noteId is required for action extraction.');
    }

    await this.markProcessing(aiJobId);
    const action = await this.prisma.actionItem.create({
      data: {
        userId,
        noteId,
        title: 'Review captured memory',
        source: 'mock',
      },
    });

    const completedJob = await this.markCompleted(aiJobId);
    const reminderJob = await this.prisma.aiJob.create({
      data: {
        userId,
        recordingId,
        memoryEventId,
        type: 'reminder_suggestion',
        status: 'pending',
        payload: { noteId },
      },
    });
    const queuedJob = await this.queueService.enqueueReminderSuggestion({
      aiJobId: reminderJob.id,
      recordingId,
      memoryEventId,
      userId,
      noteId,
    });

    return { actionItemId: action.id, aiJobId: completedJob.id, queuedJob };
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
