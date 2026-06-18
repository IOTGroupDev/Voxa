import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.EMBEDDING)
export class EmbeddingWorker extends WorkerHost {
  private readonly logger = new Logger(EmbeddingWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId, noteId } = job.data;
    this.logger.log(
      `Embedding started queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} memoryEventId=${memoryEventId} noteId=${noteId ?? 'none'}`,
    );
    if (!noteId) {
      throw new Error('noteId is required for embedding.');
    }

    await this.markProcessing(aiJobId);
    const note = await this.prisma.note.findUniqueOrThrow({ where: { id: noteId } });
    const chunk = await this.prisma.noteChunk.create({
      data: {
        userId,
        noteId,
        content: note.body ?? note.summary ?? '',
        ordinal: 0,
      },
    });

    const completedJob = await this.markCompleted(aiJobId);
    const timelineJob = await this.prisma.aiJob.create({
      data: {
        userId,
        recordingId,
        memoryEventId,
        type: 'timeline_update',
        status: 'pending',
        payload: { noteId, noteChunkId: chunk.id },
      },
    });
    const queuedJob = await this.queueService.enqueueTimelineUpdate({
      aiJobId: timelineJob.id,
      recordingId,
      memoryEventId,
      userId,
      noteId,
    });
    this.logger.log(
      `Embedding completed queueJobId=${job.id} aiJobId=${completedJob.id} noteChunkId=${chunk.id} nextQueueJobId=${queuedJob.jobId}`,
    );

    return { noteChunkId: chunk.id, aiJobId: completedJob.id, queuedJob };
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
