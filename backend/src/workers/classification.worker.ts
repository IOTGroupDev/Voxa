import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { MemoryEventType, QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.CLASSIFICATION)
export class ClassificationWorker extends WorkerHost {
  private readonly logger = new Logger(ClassificationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId } = job.data;
    this.logger.log(
      `Classification started queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} memoryEventId=${memoryEventId}`,
    );

    await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    const transcript = await this.prisma.transcript.findUnique({
      where: { recordingId },
    });
    const classification = classifyTranscript(transcript?.text ?? '');

    const memoryEvent = await this.prisma.memoryEvent.update({
      where: { id: memoryEventId },
      data: {
        type: classification.type,
        confidence: classification.confidence,
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
    this.logger.log(
      `Classification completed queueJobId=${job.id} aiJobId=${completedJob.id} memoryEventId=${memoryEventId} type=${memoryEvent.type} confidence=${classification.confidence} nextQueueJobId=${queuedJob.jobId}`,
    );

    return { memoryEventId, aiJobId: completedJob.id, queuedJob };
  }
}

function classifyTranscript(text: string): { type: MemoryEventType; confidence: number } {
  const normalized = text.toLowerCase();

  if (/\b(todo|task|action|надо|задача|сделать)\b/.test(normalized)) {
    return { type: MemoryEventType.TASK, confidence: 0.72 };
  }

  if (/\b(idea|идея|можно|proposal|concept)\b/.test(normalized)) {
    return { type: MemoryEventType.IDEA, confidence: 0.68 };
  }

  if (/\b(important|важно|critical|срочно)\b/.test(normalized)) {
    return { type: MemoryEventType.IMPORTANT, confidence: 0.7 };
  }

  if (/\b(meeting|call|созвон|встреча)\b/.test(normalized)) {
    return { type: MemoryEventType.MEETING, confidence: 0.66 };
  }

  return { type: MemoryEventType.QUICK_NOTE, confidence: 0.55 };
}
