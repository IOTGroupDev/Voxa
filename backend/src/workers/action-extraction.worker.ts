import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.ACTION_EXTRACTION)
export class ActionExtractionWorker extends WorkerHost {
  private readonly logger = new Logger(ActionExtractionWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId, noteId } = job.data;
    this.logger.log(
      `Action extraction started queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} memoryEventId=${memoryEventId} noteId=${noteId ?? 'none'}`,
    );
    if (!noteId) {
      throw new Error('noteId is required for action extraction.');
    }

    await this.markProcessing(aiJobId);
    const note = await this.prisma.note.findUniqueOrThrow({ where: { id: noteId } });
    const actionTitle = inferActionTitle([note.title, note.summary, note.body].filter(Boolean).join(' '));
    const action = actionTitle
      ? await this.prisma.actionItem.create({
          data: {
            userId,
            noteId,
            title: actionTitle,
            source: 'capture_pipeline',
          },
        })
      : null;

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
    this.logger.log(
      `Action extraction completed queueJobId=${job.id} aiJobId=${completedJob.id} actionItemId=${action?.id ?? 'none'} nextQueueJobId=${queuedJob.jobId}`,
    );

    return { actionItemId: action?.id ?? null, aiJobId: completedJob.id, queuedJob };
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

function inferActionTitle(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!/\b(todo|task|action|надо|нужно|сделать|follow up|follow-up)\b/i.test(normalized)) {
    return null;
  }

  return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized;
}
