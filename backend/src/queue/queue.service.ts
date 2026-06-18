import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RECORDING_UPLOADED)
    private readonly recordingUploadedQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TRANSCRIPTION)
    private readonly transcriptionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CLASSIFICATION)
    private readonly classificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SUMMARY)
    private readonly summaryQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ACTION_EXTRACTION)
    private readonly actionExtractionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REMINDER_SUGGESTION)
    private readonly reminderSuggestionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMBEDDING)
    private readonly embeddingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TIMELINE_UPDATE)
    private readonly timelineUpdateQueue: Queue,
    @InjectQueue(QUEUE_NAMES.INSIGHT)
    private readonly insightQueue: Queue,
  ) {}

  async enqueueRecordingUploaded(input: {
    aiJobId: string;
    recordingId: string;
    memoryEventId: string;
    userId: string;
  }) {
    const job = await this.recordingUploadedQueue.add('recording_uploaded', input, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(
      `Enqueued job queue=${QUEUE_NAMES.RECORDING_UPLOADED} jobName=recording_uploaded jobId=${job.id} aiJobId=${input.aiJobId} recordingId=${input.recordingId} memoryEventId=${input.memoryEventId}`,
    );

    return { queue: QUEUE_NAMES.RECORDING_UPLOADED, jobId: job.id, ...input };
  }

  async enqueueTranscription(input: {
    aiJobId: string;
    recordingId: string;
    memoryEventId: string;
    userId: string;
  }) {
    return this.enqueue(this.transcriptionQueue, QUEUE_NAMES.TRANSCRIPTION, 'transcription', input);
  }

  enqueueClassification(input: AiPipelineQueueInput) {
    return this.enqueue(this.classificationQueue, QUEUE_NAMES.CLASSIFICATION, 'classification', input);
  }

  enqueueSummary(input: AiPipelineQueueInput) {
    return this.enqueue(this.summaryQueue, QUEUE_NAMES.SUMMARY, 'summary', input);
  }

  enqueueActionExtraction(input: AiPipelineQueueInput & { noteId: string }) {
    return this.enqueue(
      this.actionExtractionQueue,
      QUEUE_NAMES.ACTION_EXTRACTION,
      'action_extraction',
      input,
    );
  }

  enqueueReminderSuggestion(input: AiPipelineQueueInput & { noteId: string }) {
    return this.enqueue(
      this.reminderSuggestionQueue,
      QUEUE_NAMES.REMINDER_SUGGESTION,
      'reminder_suggestion',
      input,
    );
  }

  enqueueEmbedding(input: AiPipelineQueueInput & { noteId: string }) {
    return this.enqueue(this.embeddingQueue, QUEUE_NAMES.EMBEDDING, 'embedding', input);
  }

  enqueueTimelineUpdate(input: AiPipelineQueueInput & { noteId: string }) {
    return this.enqueue(this.timelineUpdateQueue, QUEUE_NAMES.TIMELINE_UPDATE, 'timeline_update', input);
  }

  enqueueInsight(input: AiPipelineQueueInput & { noteId: string; memoryThreadId: string }) {
    return this.enqueue(this.insightQueue, QUEUE_NAMES.INSIGHT, 'insight', input);
  }

  private async enqueue<T extends AiPipelineQueueInput>(
    queue: Queue,
    queueName: string,
    jobName: string,
    input: T,
  ) {
    const job = await queue.add(jobName, input, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(
      `Enqueued job queue=${queueName} jobName=${jobName} jobId=${job.id} aiJobId=${input.aiJobId} recordingId=${input.recordingId} memoryEventId=${input.memoryEventId}`,
    );

    return { queue: queueName, jobId: job.id, ...input };
  }
}

export interface AiPipelineQueueInput {
  aiJobId: string;
  recordingId: string;
  memoryEventId: string;
  userId: string;
}
