# AI Pipeline

The AI pipeline is queue-based and provider-agnostic.

```txt
recording_uploaded
-> transcription_queue
-> transcript_created
-> classification_queue
-> summary_queue
-> action_extraction_queue
-> reminder_suggestion_queue
-> embedding_queue
-> timeline_update_queue
-> completed
```

## Provider Interfaces

Backend provider contracts live in `backend/src/ai/providers.ts`:

- `SpeechToTextProvider`
- `SummaryProvider`
- `EmbeddingProvider`
- `ActionExtractionProvider`
- `ReminderSuggestionProvider`
- `EventClassificationProvider`

The first production provider can be OpenAI/Whisper-compatible, but product logic should depend only on the interfaces.

## Workers

Worker skeletons live in `backend/src/workers`:

- `transcription.worker.ts`
- `summary.worker.ts`
- `embedding.worker.ts`
- `action-extraction.worker.ts`
- `reminder-suggestion.worker.ts`
- `timeline.worker.ts`
- `cleanup.worker.ts`

Workers should persist `AiJob` state transitions and retry metadata before integrating external providers.

## Current MVP Wiring

`PATCH /capture/session/:id/complete` creates an `AiJob` with type `transcription` and enqueues `recording_uploaded`.

The `RecordingUploadedWorker` forwards that payload into `transcription_queue`.

The current mock worker chain is:

```txt
RecordingUploadedWorker
-> TranscriptionWorker
-> ClassificationWorker
-> SummaryWorker
-> ActionExtractionWorker
-> ReminderSuggestionWorker
-> EmbeddingWorker
-> TimelineWorker
```

Each worker updates its `AiJob`, creates the next `AiJob`, and enqueues the next queue. Provider calls are still mocked and should be replaced behind the provider interfaces.
