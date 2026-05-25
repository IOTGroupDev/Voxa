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
- AI providers are interfaces, not hardcoded vendor calls.

## Risks And Unknowns

- Mobile is pinned to Expo SDK 56, which satisfies the SDK 54+ requirement and avoids stale React Native peer conflicts.
- Production Bluetooth microphone routing may require native modules and platform-specific behavior.
- Supabase RLS policies need to be implemented as SQL migrations, not only documented.
- pgvector embedding dimensions must be chosen before adding production indexes.
- Hardware gesture timing and debounce behavior need real dongle validation.
- Mobile npm audit currently reports moderate transitive Expo tooling warnings through `uuid`/`xcode`; no high-severity mobile findings were present during scaffold verification.
