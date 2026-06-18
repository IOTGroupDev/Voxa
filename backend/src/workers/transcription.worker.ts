import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(TranscriptionWorker.name);

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
    const startedAt = Date.now();
    this.logger.log(
      `Transcription started queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} memoryEventId=${memoryEventId}`,
    );

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
      let transcript = await this.prisma.transcript.findUnique({
        where: { recordingId },
      });

      if (transcript) {
        this.logger.log(`Existing transcript found recordingId=${recordingId} transcriptId=${transcript.id}`);
      } else {
        this.logger.log(`Transcription loading audio recordingId=${recordingId} storagePath=${recording.storagePath}`);
        const download = await this.storageService.createSignedDownloadUrl(recording.storagePath, 15 * 60);
        const sttProvider = this.sttProviderFactory.create();
        this.logger.log(`Calling STT provider recordingId=${recordingId} mimeType=${recording.mimeType ?? 'unknown'}`);
        const sttResult = await sttProvider.transcribe({
          recordingId,
          storagePath: recording.storagePath,
          signedUrl: download.signedUrl,
          mimeType: recording.mimeType,
          durationMs: recording.durationMs,
        });

        transcript = await this.prisma.transcript.create({
          data: {
            userId,
            recordingId,
            text: sttResult.text,
            language: sttResult.language,
            provider: sttResult.provider,
          },
        });
      }

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

      const summaryJob = await this.prisma.aiJob.create({
        data: {
          userId,
          recordingId,
          memoryEventId,
          type: 'summary',
          status: 'pending',
          payload: { transcriptId: transcript.id },
        },
      });

      const queuedJob = await this.queueService.enqueueSummary({
        aiJobId: summaryJob.id,
        recordingId,
        memoryEventId,
        userId,
      });
      this.logger.log(
        `Transcription completed queueJobId=${job.id} aiJobId=${completedJob.id} transcriptId=${transcript.id} nextQueueJobId=${queuedJob.jobId} durationMs=${Date.now() - startedAt}`,
      );

      return { transcriptId: transcript.id, aiJobId: completedJob.id, queuedJob };
    } catch (error) {
      const message = formatWorkerError(error);
      const willRetry = willRetryJob(job);
      this.logger.error(
        `Transcription failed queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} willRetry=${willRetry} error=${message}`,
      );

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
  private readonly logger = new Logger(RecordingUploadedWorker.name);

  constructor(private readonly queueService: QueueService) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    this.logger.log(
      `Recording uploaded event received queueJobId=${job.id} aiJobId=${job.data.aiJobId} recordingId=${job.data.recordingId}`,
    );
    return this.queueService.enqueueTranscription(job.data);
  }
}
