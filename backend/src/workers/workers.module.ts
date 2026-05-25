import { Module } from '@nestjs/common';
import { CleanupWorker } from './cleanup.worker';
import { EmbeddingWorker } from './embedding.worker';
import { ActionExtractionWorker } from './action-extraction.worker';
import { ReminderSuggestionWorker } from './reminder-suggestion.worker';
import { SummaryWorker } from './summary.worker';
import { TimelineWorker } from './timeline.worker';
import { TranscriptionWorker } from './transcription.worker';

@Module({
  providers: [
    TranscriptionWorker,
    SummaryWorker,
    EmbeddingWorker,
    ActionExtractionWorker,
    ReminderSuggestionWorker,
    TimelineWorker,
    CleanupWorker,
  ],
})
export class WorkersModule {}

