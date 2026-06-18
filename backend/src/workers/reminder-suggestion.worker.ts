import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.REMINDER_SUGGESTION)
export class ReminderSuggestionWorker extends WorkerHost {
  private readonly logger = new Logger(ReminderSuggestionWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId, noteId } = job.data;
    this.logger.log(
      `Reminder suggestion started queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} memoryEventId=${memoryEventId} noteId=${noteId ?? 'none'}`,
    );
    if (!noteId) {
      throw new Error('noteId is required for reminder suggestion.');
    }

    await this.markProcessing(aiJobId);
    const note = await this.prisma.note.findUniqueOrThrow({ where: { id: noteId } });
    const reminderTitle = inferReminderTitle([note.title, note.summary, note.body].filter(Boolean).join(' '));
    const reminder = reminderTitle
      ? await this.prisma.reminder.create({
          data: {
            userId,
            noteId,
            title: reminderTitle,
            remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            source: 'capture_pipeline',
          },
        })
      : null;

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
    this.logger.log(
      `Reminder suggestion completed queueJobId=${job.id} aiJobId=${completedJob.id} reminderId=${reminder?.id ?? 'none'} nextQueueJobId=${queuedJob.jobId}`,
    );

    return { reminderId: reminder?.id ?? null, aiJobId: completedJob.id, queuedJob };
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

function inferReminderTitle(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!/\b(remind|reminder|напомни|напоминание|tomorrow|завтра|later|позже)\b/i.test(normalized)) {
    return null;
  }

  return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized;
}
