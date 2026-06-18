import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.SUMMARY)
export class SummaryWorker extends WorkerHost {
  private readonly logger = new Logger(SummaryWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId } = job.data;
    this.logger.log(
      `Summary started queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} memoryEventId=${memoryEventId}`,
    );
    await this.markProcessing(aiJobId);
    const transcript = await this.prisma.transcript.findUnique({
      where: { recordingId },
    });
    const body = normalizeText(transcript?.text ?? '');
    const title = createTitle(body);
    const summary = createSummary(body);

    const note = await this.prisma.note.upsert({
      where: { memoryEventId },
      update: {
        title,
        summary,
        body,
      },
      create: {
        userId,
        memoryEventId,
        title,
        summary,
        body,
      },
    });

    await this.prisma.memoryEvent.update({
      where: { id: memoryEventId },
      data: {
        noteId: note.id,
        title: note.title,
        summary: note.summary,
        processingStatus: 'summary_created',
      },
    });

    const recording = await this.prisma.recording.findUniqueOrThrow({
      where: { id: recordingId },
      select: { storagePath: true },
    });
    await this.storageService.deleteAudioObject(recording.storagePath);

    const completedJob = await this.markCompleted(aiJobId);
    const timelineJob = await this.createAiJob(userId, recordingId, memoryEventId, 'timeline_update', {
      noteId: note.id,
    });
    const queuedJob = await this.queueService.enqueueTimelineUpdate({
      aiJobId: timelineJob.id,
      recordingId,
      memoryEventId,
      userId,
      noteId: note.id,
    });
    this.logger.log(
      `Summary completed queueJobId=${job.id} aiJobId=${completedJob.id} noteId=${note.id} nextQueueJobId=${queuedJob.jobId}`,
    );

    return { noteId: note.id, aiJobId: completedJob.id, queuedJob };
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

  private createAiJob(
    userId: string,
    recordingId: string,
    memoryEventId: string,
    type: 'timeline_update',
    payload: Record<string, string>,
  ) {
    return this.prisma.aiJob.create({
      data: { userId, recordingId, memoryEventId, type, status: 'pending', payload },
    });
  }
}

function normalizeText(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : 'Audio captured without transcript text.';
}

function createTitle(text: string) {
  const firstSentence = text.split(/[.!?\n]/)[0]?.trim() ?? '';
  const title = firstSentence || 'Captured memory';
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

function createSummary(text: string) {
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}
