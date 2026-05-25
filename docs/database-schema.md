# Database Schema

The Prisma draft is in `backend/prisma/schema.prisma`.

## Core Models

- `User`: local product record linked to `supabaseUserId`.
- `Device`: paired Bluetooth dongle metadata.
- `CaptureSession`: durable capture lifecycle from mobile/dongle trigger to completed or cancelled recording.
- `Recording`: private audio file metadata and processing status.
- `MemoryEvent`: primary domain object combining capture source, context, recording, AI interpretation, and timeline identity.
- `ContextSnapshot`: privacy-first context captured at recording time.
- `Transcript`: speech-to-text result for a recording.
- `Note`: AI/user-facing memory note attached to a Memory Event.
- `NoteChunk`: searchable chunk with future pgvector embedding.
- `Tag` / `NoteTag`: user-owned tagging.
- `ActionItem`: extracted or user-managed action.
- `Reminder`: suggested or user-created reminder.
- `DailySummary`: generated day-level memory summary.
- `AiJob`: durable AI pipeline state.
- `SyncItem`: future local sync queue/projection state.

## Ownership

All user-owned tables include `userId`. Supabase RLS should enforce `user_id = auth.uid()` at the SQL policy layer after mapping product users to Supabase users.

## pgvector

`NoteChunk.embedding` is modeled as `Unsupported("vector")` in Prisma. The first migration should enable the `vector` extension and add the appropriate vector index once embedding dimensions are chosen.
