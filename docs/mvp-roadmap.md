# MVP Roadmap

## Phase 1: Foundation

- Keep light-monorepo structure.
- Finalize shared enums/DTOs.
- Convert Prisma draft into first migration.
- Add Supabase Auth JWT guard.
- Add RLS policy migrations.

## Phase 2: Capture

- Implement mobile manual recording with local `expo-audio` file capture.
- Add three capture start choices: phone button, AirPods/Siri Shortcut, and Voxa dongle.
- Implement mock dongle events in app flows.
- Add architecture-only interfaces for future autonomous dongle storage.
- Persist future dongle backend-sync retry state locally with SQLite.
- Persist unsynced local captures with SQLite.
- Retry queued uploads when backend access returns.
- Create capture sessions.
- Generate signed upload URLs.
- Upload audio file bytes to `audio-private` through signed upload URLs.

## Phase 3: Memory Events

- Create Recording and MemoryEvent from completed capture.
- Persist ContextSnapshot.
- Show capture history and Memory Event details.

## Phase 4: AI Pipeline

- Add BullMQ queue processors.
- Integrate the first STT provider.
- Generate transcript, summary, tags, actions, reminders, embeddings, and timeline updates.

## Phase 5: Product Surfaces

- Build timeline.
- Build Memory Threads.
- Build low-frequency Insights.
- Build actions inbox.
- Build reminder suggestions.
- Build semantic search.
- Add privacy settings and retention controls.

## Not In MVP

- production BLE implementation;
- production Bluetooth audio implementation;
- runtime offline dongle storage;
- runtime BLE file synchronization;
- realtime transcription;
- always-on recording;
- stealth recording;
- speaker diarization;
- edge AI on dongle;
- subscriptions;
- hardware OTA implementation;
- polished final UI.

## Future Hardware Track

- Autonomous dongle storage with SPI NOR Flash.
- Append-only device recording log.
- Chunked encrypted sync from dongle to phone.
- Secure erase after backend confirmation.
- Resume and corruption recovery for interrupted transfers.
