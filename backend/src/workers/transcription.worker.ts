import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiPipelineQueueInput, QueueService } from '../queue/queue.service';
import { SpeechToTextProviderFactory } from '../ai/speech-to-text.provider';
import { StorageService } from '../storage/storage.service';

@Injectable()
@Processor(QUEUE_NAMES.TRANSCRIPTION)
export class TranscriptionWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly sttProviderFactory: SpeechToTextProviderFactory,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId } = job.data;

    try {
      await this.prisma.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });

      const recording = await this.prisma.recording.findUniqueOrThrow({
        where: { id: recordingId },
      });
      const download = await this.storageService.createSignedDownloadUrl(recording.storagePath, 15 * 60);
      const sttProvider = this.sttProviderFactory.create();
      const sttResult = await sttProvider.transcribe({
        recordingId,
        storagePath: recording.storagePath,
        signedUrl: download.signedUrl,
        mimeType: recording.mimeType,
        durationMs: recording.durationMs,
      });

      const transcript = await this.prisma.transcript.upsert({
        where: { recordingId },
        update: {
          text: sttResult.text,
          language: sttResult.language,
          provider: sttResult.provider,
        },
        create: {
          userId,
          recordingId,
          text: sttResult.text,
          language: sttResult.language,
          provider: sttResult.provider,
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
    } catch (error) {
      const message = formatWorkerError(error);
      const willRetry = willRetryJob(job);

      await this.prisma.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: willRetry ? 'retrying' : 'failed',
          lastError: message,
          completedAt: willRetry ? null : new Date(),
        },
      });

      if (!willRetry) {
        await this.prisma.recording.update({
          where: { id: recordingId },
          data: { status: 'failed' },
        });
      }

      await this.prisma.memoryEvent.update({
        where: { id: memoryEventId },
        data: { processingStatus: willRetry ? 'transcription_retrying' : 'transcription_failed' },
      });

      throw error;
    }
  }
}

export type AiPipelineJobData = AiPipelineQueueInput & { noteId?: string };

function formatWorkerError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown transcription worker error.';
}

function willRetryJob(job: Job) {
  const maxAttempts = job.opts.attempts ?? 1;
  const nextFailedAttempt = job.attemptsMade + 1;

  return nextFailedAttempt < maxAttempts;
}

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
