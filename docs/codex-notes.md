# Codex Notes

This scaffold follows `docs/CODEX_TASK.md` as the source of truth.

## Decisions

- `MemoryEvent` is the main product object.
- `Recording` is technical audio metadata.
- Audio and control are separate: Bluetooth audio profile for microphone input, BLE custom service for button/battery/status/indicator.
- Shared code is limited to TypeScript contracts.
- Backend modules are domain-oriented and intentionally contain TODO placeholders.
- Recordings, capture sessions, and Memory Events now have Prisma-backed MVP persistence.
- BullMQ now has a complete mock pipeline from `recording_uploaded` through timeline update.
- Notes, actions, reminders, timeline, daily summary, and keyword search endpoints now read/write Prisma data with ownership checks.
- New master task reframes Voxa as a continuity memory system. Avoid chatbot, copilot, dashboard, kanban, and productivity-first UX.
- MemoryThread and Insight architecture were added to align the domain model with recurring themes and rare resurfacing.
- Mobile local-first storage now uses an `expo-sqlite` backed draft store plus an offline sync coordinator for retrying queued uploads.
- NetInfo reconnect handling now triggers pending upload retry from the mobile app root.
- Local upload queue is now persisted in SQLite, so pending uploads survive app restarts.
- Mock capture is split into local-first capture plus best-effort backend sync. Production BLE/audio and real file upload remain intentionally out of scope.
- Backend devices are now Prisma-backed, and mobile mock dongle events are wired into capture flow.
- Mobile has a simple manual testing shell for moving between core MVP surfaces without adding production navigation complexity.
- AI reprocess endpoints now create real `AiJob` records and re-enqueue the mock pipeline with ownership checks.
- AI providers are interfaces, not hardcoded vendor calls.
- Hardware capture is phone-dependent for MVP: the dongle triggers recording but does not store audio offline. A powered-off or unavailable phone means no audio recording.
- Future dongle storage now has a SQLite-backed backend sync retry queue for phone-transferred recordings.
- Mock dongle storage exposes manual failure modes for missing chunks and checksum mismatch so sync behavior can be tested without hardware.
- Device mock UI tracks active/lost status locally and blocks sync for non-active devices before backend rejection.
- Manual mobile capture now has an `expo-audio` recorder path that produces a local recording URI and uploads through `expo-file-system` when Supabase signed upload URLs are configured.
- Capture start now has three modeled paths: phone button, AirPods/Siri Shortcut, and Voxa dongle.
- Backend transcription worker can call an HTTP CPU STT service through `STT_PROVIDER=whisper_http` and `STT_HTTP_ENDPOINT`; mock fallback remains.

## Risks And Unknowns

- Mobile is pinned to Expo SDK 56, which satisfies the SDK 54+ requirement and avoids stale React Native peer conflicts.
- Production Bluetooth microphone routing may require native modules and platform-specific behavior.
- Supabase RLS policies need to be implemented as SQL migrations, not only documented.
- pgvector embedding dimensions must be chosen before adding production indexes.
- Hardware gesture timing and debounce behavior need real dongle validation.
- Mobile npm audit currently reports moderate transitive Expo tooling warnings through `uuid`/`xcode`; no high-severity mobile findings were present during scaffold verification.
