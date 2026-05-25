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

