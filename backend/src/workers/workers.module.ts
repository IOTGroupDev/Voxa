import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { ClassificationWorker } from './classification.worker';
import { CleanupWorker } from './cleanup.worker';
import { EmbeddingWorker } from './embedding.worker';
import { InsightWorker } from './insight.worker';
import { ActionExtractionWorker } from './action-extraction.worker';
import { ReminderSuggestionWorker } from './reminder-suggestion.worker';
import { SummaryWorker } from './summary.worker';
import { TimelineWorker } from './timeline.worker';
import { RecordingUploadedWorker, TranscriptionWorker } from './transcription.worker';

@Module({
  imports: [QueueModule],
  providers: [
    TranscriptionWorker,
    RecordingUploadedWorker,
    ClassificationWorker,
    SummaryWorker,
    EmbeddingWorker,
    InsightWorker,
    ActionExtractionWorker,
    ReminderSuggestionWorker,
    TimelineWorker,
    CleanupWorker,
  ],
})
export class WorkersModule {}
