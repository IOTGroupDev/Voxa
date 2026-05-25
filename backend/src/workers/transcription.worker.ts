import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiPipelineQueueInput, QueueService } from '../queue/queue.service';

@Injectable()
@Processor(QUEUE_NAMES.TRANSCRIPTION)
export class TranscriptionWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId } = job.data;

    await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    const transcript = await this.prisma.transcript.upsert({
      where: { recordingId },
      update: {
        text: 'TODO: Replace mock transcript with SpeechToTextProvider output.',
        provider: 'mock',
      },
      create: {
        userId,
        recordingId,
        text: 'TODO: Replace mock transcript with SpeechToTextProvider output.',
        provider: 'mock',
      },
    });

    await this.prisma.recording.update({
      where: { id: recordingId },
      data: { status: 'processing' },
    });

    await this.prisma.memoryEvent.update({
      where: { id: memoryEventId },
      data: {
        transcriptId: transcript.id,
        processingStatus: 'transcript_created',
      },
    });

    const completedJob = await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    const classificationJob = await this.prisma.aiJob.create({
      data: {
        userId,
        recordingId,
        memoryEventId,
        type: 'classification',
        status: 'pending',
        payload: { transcriptId: transcript.id },
      },
    });

    const queuedJob = await this.queueService.enqueueClassification({
      aiJobId: classificationJob.id,
      recordingId,
      memoryEventId,
      userId,
    });

    return { transcriptId: transcript.id, aiJobId: completedJob.id, queuedJob };
  }
}

export type AiPipelineJobData = AiPipelineQueueInput & { noteId?: string };

@Injectable()
@Processor(QUEUE_NAMES.RECORDING_UPLOADED)
export class RecordingUploadedWorker extends WorkerHost {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    return this.queueService.enqueueTranscription(job.data);
  }
}
