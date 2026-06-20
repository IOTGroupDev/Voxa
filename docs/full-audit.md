# Voxa Full Technical And Product Audit

Date: 2026-06-19

Scope: local repository audit of `mobile`, `backend`, `shared`, `stt-service`, current voice capture flow, Voice Ask, system TTS, navigation/UX structure, database shape, and active capture-to-note processing. This is a technical and product-UX audit, not a penetration test or production readiness certification.

## Executive Summary

Voxa has moved from a generic capture/timeline prototype toward a voice-first AI notes product. The current app model is now closer to the competitive category: `Today`, central `Record`, `Library`, `Ask`, and `Settings`. The core path is:

`Record audio -> upload -> local STT -> note/idea/task/reminder detection -> summary -> Library -> Ask/search`

Recent work added:

- `Library` as the unified surface for all saved content.
- `Ask` with text and voice input.
- System TTS feedback through `expo-speech`.
- Persisted language and voice feedback settings.
- Voice command parsing for `note`, `idea`, `task`, and `reminder`.
- Local STT service support for both signed storage URLs and direct base64 audio for Voice Ask.
- Audio deletion from private bucket after summary/note creation.
- Better API error propagation for failed Voice Ask requests.

The main remaining issue is product completeness: the app has the pieces, but the flow still needs stronger “record -> result -> act” continuity. Ask is still search-backed, not a real answer engine. Library has sections, but results are basic. Settings and main copy have been reduced, but several secondary screens still carry generic empty states and older technical language.

## Verification Commands

| Command | Result |
| --- | --- |
| `cd backend && npm run typecheck` | Pass |
| `cd mobile && npm run typecheck` | Pass |
| `python3 -m py_compile stt-service/main.py` | Pass |
| `cd shared && npm run typecheck` | Fail: script does not exist |
| `cd shared && npm run build` | Previously passed |

## Current Product Shape

### Mobile Navigation

Current bottom navigation:

- `Today`
- `Record`
- `Library`
- `Ask`
- `Settings`

`Library` contains subroutes:

- `All`
- `Notes`
- `Topics`
- `Highlights`
- `To-do`
- `Reminders`

This is a better mental model than the previous admin-style `Home / Timeline / Search` structure. It matches the category pattern seen in Granola, Voicenotes, TalkNotes, and Plaud: record first, then produce notes, actions, summaries, and queryable memory.

### Capture

The central action is recording. Capture can start from the main tab or Today. Recording state is reflected in UI color and timer. TTS can announce short confirmations.

Current capture processing:

1. Mobile records audio locally.
2. Mobile uploads audio to private storage.
3. Backend creates capture session, recording, memory event, and AI job.
4. Worker calls local HTTP STT.
5. Summary worker creates/updates Note.
6. Voice command parser may classify it as note/idea/task/reminder.
7. Summary worker deletes audio object from storage.
8. Timeline worker completes recording and attaches thread.

### Voice Commands

Implemented command prefixes:

- `note`, `заметка`, `запиши`, `запомни`
- `idea`, `идея`, `мысль`
- `task`, `задача`, `дело`, `todo`, `надо`, `нужно`
- `reminder`, `напоминание`, `напомни`

Reminder parsing currently supports simple time phrases:

- tomorrow / завтра
- today / сегодня
- in N minutes / через N минут
- in N hours / через N часов

This is useful but still not robust natural language scheduling.

### Ask

Ask now supports:

- text input
- voice input
- direct `/api/ask/transcribe` endpoint
- STT through the local STT service
- client-side 30-second voice question limit
- better API error body display

Important limitation: Ask is still backed by keyword search. It is not yet a real AI answer feature with citations/sources.

## Competitive Gap

Observed category patterns:

- Granola emphasizes notes, actions, memory, and staying present.
- Voicenotes emphasizes record, summary, action items, and Ask AI.
- TalkNotes emphasizes transforming voice into structured formats.
- Plaud emphasizes summaries, mind maps, templates, Ask, export/share, and workflow automation.

Voxa has the foundation but is missing these higher-value surfaces:

1. Real Ask answers across notes/transcripts, not just keyword results.
2. Structured output formats: note, task list, meeting, journal, idea brief.
3. Post-processing result screen: summary, transcript, tasks, reminders, related topics.
4. Export/share for notes.
5. Source-linked answers and references in Ask.
6. Processing progress that feels deliberate after recording stops.
7. Templates or “record as” modes before capture.

## Critical Findings

### 1. Runtime Request Validation Is Still Missing

Severity: Critical

Evidence:

- `backend/src/main.ts` configures body limits but does not install a global `ValidationPipe`.
- Most DTOs are TypeScript interfaces, not runtime validation schemas.
- Controllers accept `@Body()` directly.
- New `AskService` validates only locally and manually.

Impact: malformed enum values, missing fields, oversized payloads, invalid dates, and unexpected fields can reach service/database logic.

Recommended fix:

- Add runtime DTO classes or Zod schemas.
- Install a global validation pipe.
- Reject unknown fields.
- Add route-specific limits for `/ask/transcribe` and normal JSON routes.

### 2. Config Validation Is Missing At Startup

Severity: Critical

Evidence:

- Required env vars are read directly in services.
- `SUPABASE_URL` is read at module import time in auth.
- STT/storage/Redis configuration fails only when first used.

Impact: broken deployments can boot and then fail during user actions.

Recommended fix:

- Add startup validation for `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `STT_HTTP_ENDPOINT`, storage bucket settings.
- Fail fast with clear logs.

## High Findings

### 3. Ask Is Not Yet A Real Ask Feature

Severity: High

Evidence:

- `Ask` UI now supports voice input.
- Query still uses existing search flow and returns matching objects.
- No answer synthesis, source references, or conversational result model exists.

Impact: UX promises Ask, but backend behaves like search. This will feel broken once users expect answers.

Recommended fix:

- Add `/ask` answer endpoint.
- Retrieve candidate notes/transcripts/events.
- Generate answer with references to note ids.
- Render answer + sources in mobile.

### 4. Voice Ask Uses Base64 JSON Payloads

Severity: High

Evidence:

- Mobile reads audio into base64.
- Backend accepts JSON body with base64 audio.
- `main.ts` body limit was raised to 12 MB.

Impact: base64 adds memory overhead and can fail on lower-end devices or long questions. It also requires higher JSON body limits globally.

Recommended fix:

- Prefer multipart upload or direct binary upload for Voice Ask.
- Scope body size limits per route instead of globally.
- Keep strict duration limits.

### 5. Capture Completion Is Not Transactional

Severity: High

Evidence:

- Capture completion still creates/updates `MemoryEvent`, `CaptureSession`, `Recording`, `AiJob`, and queue work in separate operations.

Impact: partial failures can leave completed sessions without queued jobs or memory events with incomplete state.

Recommended fix:

- Wrap DB writes in Prisma transaction.
- Use idempotency keys or outbox pattern for queue enqueue.

### 6. Offline Sync Errors Are Still Weak

Severity: High

Evidence:

- Offline sync returns `{ synced: false }` without detailed persisted failure state.
- Upload queue does not expose user-visible error reasons.

Impact: local recordings may remain stuck without clear recovery.

Recommended fix:

- Store last error and attempts per queue item.
- Surface stuck sync state in Library or Settings.
- Add retry/backoff and manual retry.

### 7. API Client Now Shows Error Bodies But Auth Errors Are Still Blunt

Severity: High

Evidence:

- `mobile/src/lib/api/client.ts` now reads backend error bodies.
- `default-client.ts` still ignores Supabase `getSession()` errors and sends unauthenticated requests if token is missing.

Impact: users may see backend 401 instead of a clean “session expired” flow.

Recommended fix:

- Throw typed auth errors when session retrieval fails.
- Centralize logout/session refresh handling.

### 8. Audio Upload Still Reads Entire Files Into Memory

Severity: High

Evidence:

- `mobile/src/lib/storage/audio-file-upload.ts` reads full audio as base64 and converts to `Uint8Array`.
- Voice Ask also reads audio fully as base64.

Impact: memory spikes on long recordings.

Recommended fix:

- Use streaming/file upload API where possible.
- Enforce max recording duration until streaming is implemented.

## Medium Findings

### 9. The AI Pipeline Still Carries Legacy Workers

Severity: Medium

Evidence:

- Active path is `transcription -> summary -> timeline_update`.
- Legacy workers still exist for classification, action extraction, reminder suggestion, embedding, insight.
- Summary worker now creates direct task/reminder records for explicit voice commands.

Impact: future maintainers may not know which pipeline is canonical.

Recommended fix:

- Document canonical pipeline.
- Remove or clearly mark disabled workers.
- Reintroduce action/reminder/insight workers only if they become active and tested.

### 10. Ask Audio Error Handling Improved But Needs Runtime Observability

Severity: Medium

Evidence:

- Backend logs Voice Ask transcription start/failure/completion.
- Client now surfaces error body.
- There is no request id returned to mobile.

Impact: support/debug still requires correlating timestamps manually.

Recommended fix:

- Return `requestId` from Ask transcription.
- Log it on client when failures happen.

### 11. Secondary Screens Still Need UX Cleanup

Severity: Medium

Evidence:

- Settings and Ask were cleaned up.
- Timeline/Library subviews still include some generic empty states and technical status text.
- Timeline edit/delete labels still use older wording in places.

Impact: product now has a better shell but still feels inconsistent deeper in Library.

Recommended fix:

- Rewrite Timeline status labels around user outcomes.
- Replace generic empty states with actionable commands or remove descriptions.
- Build a single note/result detail screen.

### 12. No Automated Tests Are Present

Severity: Medium

Evidence:

- No meaningful local test suite exists.
- Package scripts rely on typecheck/build only.

Impact: capture, queue, Ask, storage cleanup, and navigation regressions are manual.

Recommended fix:

- Add backend unit tests for voice command parser and Ask service.
- Add integration tests for capture completion and storage deletion.
- Add mobile component tests for Ask voice state and navigation.

### 13. Shared Package Has No Typecheck Script

Severity: Medium

Evidence:

- `shared/package.json` has build but no typecheck script.

Impact: inconsistent CI commands across packages.

Recommended fix:

- Add `"typecheck": "tsc --noEmit -p tsconfig.json"`.

### 14. CORS Is Still Not Explicitly Configured

Severity: Medium

Evidence:

- `backend/src/main.ts` does not configure CORS.

Impact: browser/debug clients can fail unpredictably. Later broad CORS config may become unsafe.

Recommended fix:

- Add environment-driven CORS policy.

## Low Findings

### 15. Console Logging In Upload Path

Severity: Low

Evidence:

- Upload path still uses `console.log` / `console.error`.

Impact: noisy logs and possible local URI leakage in debug output.

Recommended fix:

- Replace with structured debug logger behind dev flag.

### 16. Device/Dongle Surface Is Still Unclear

Severity: Low

Evidence:

- Dongle mode exists in Settings.
- Device management is not part of the main navigation.
- Real hardware flow is not complete.

Impact: users can choose a mode whose full workflow is not obvious.

Recommended fix:

- Hide dongle mode unless hardware feature flag is enabled, or add a real device onboarding flow.

## Database Scope

Keep for current product:

- `User`
- `Recording`
- `CaptureSession`
- `MemoryEvent`
- `Transcript`
- `Note`
- `MemoryThread`
- `DailySummary`
- `ActionItem`
- `Reminder`
- `AiJob`

Questionable but potentially useful:

- `Insight`, if Highlights becomes real.
- `Tag`, `NoteTag`, if Library needs manual organization.
- `SyncItem`, if offline observability is implemented.
- `Device`, if dongle hardware is near-term.

Consider removing later:

- unused queue stages and workers if not reactivated
- mock-era device surfaces if hardware is not planned

## Security And Privacy Notes

Improvements already made:

- Audio files are deleted from private bucket after summary/note creation.
- Mock STT fallback was removed from active path; STT misconfiguration fails explicitly.
- `.env`, STT model files, `.venv`, IDE folders, and generated artifacts are ignored.

Remaining risks:

- Base64 Ask audio crosses backend and STT without storage, but still lives in request memory.
- No retention settings UI exists.
- No audit log for deletion of audio objects.
- No per-user privacy settings are implemented.

Recommended next steps:

- Add retention/privacy settings.
- Add storage deletion audit logging.
- Avoid long-lived audio payloads in JSON.
- Add request size and duration enforcement at API boundary.

## Recommended Remediation Order

1. Implement real Ask answer endpoint with source references.
2. Add runtime validation and startup config validation.
3. Replace Voice Ask base64 JSON with multipart/binary upload.
4. Make capture completion transactional/idempotent.
5. Add result screen after processing: summary, transcript, tasks, reminders, related topics.
6. Add export/share for notes.
7. Add sync observability and retry UI.
8. Add tests for voice command parser, Ask, capture completion, and storage deletion.
9. Clean secondary screen copy and status language across Library.
10. Decide whether device/dongle mode is feature-flagged or fully productized.

## Residual Risk

This audit is based on local static inspection and recent local typecheck/compile commands. It did not run a full emulator/device QA pass, real Supabase/Redis/storage integration test, dependency vulnerability audit, or security penetration test. Runtime behavior can still differ from local static verification, especially around Expo audio, mobile file handling, STT container behavior, and network limits.
