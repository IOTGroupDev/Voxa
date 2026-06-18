# Voxa Full Technical Audit

Date: 2026-06-18

Scope: local repository audit of `mobile`, `backend`, `shared`, `stt-service`, current navigation changes, database shape, and active capture-to-memory functionality. This is a technical/code audit, not a penetration test or production readiness certification.

## Executive Summary

The backend and mobile app currently typecheck. The active product path has been narrowed to the useful MVP: capture audio, upload it, transcribe it, create/update a note, update the timeline, and make the memory searchable. Bottom navigation is now focused on Home, Timeline, Capture, and Search, with Settings available from the top bar.

The database still contains models for a broader assistant surface: devices, actions, reminders, insights, tags, sync items, and legacy AI stages. Not all of them are needed for the current app. The highest-priority remaining work is runtime validation/config validation, transactional capture completion, better offline sync observability, and a deliberate migration plan for unused tables if the product direction stays focused.

## Verification Commands

| Command | Result |
| --- | --- |
| `cd backend && npm run typecheck` | Pass |
| `cd mobile && npm run typecheck` | Pass |
| `cd shared && npm run typecheck` | Fail: script does not exist |
| `cd shared && npm run build` | Pass |
| `cd mobile && npm run web -- --port 8082 --host localhost` | Fail: `web` not included in Expo `platforms` |
| `cd mobile && npm start -- --port 8082 --host localhost` | Pass: Metro started |

## Critical Findings

### 1. Runtime Request Validation Is Missing Across Most Backend DTOs

Severity: Critical

Evidence:
- `backend/src/main.ts:5-7` creates the Nest app and sets the global prefix, but does not install a `ValidationPipe`.
- DTOs in `shared/src/dto/index.ts:17-110` are TypeScript interfaces only. They do not exist at runtime and cannot validate request bodies.
- Controllers pass `@Body()` directly into services, for example `backend/src/capture/capture.controller.ts:12` and `backend/src/recordings/recordings.controller.ts:17`.

Impact: invalid enum values, malformed dates, missing nested objects, and incorrect payload shapes can reach service/database logic. Some endpoints have local validation, but most do not.

Recommended fix: introduce runtime DTO classes or schemas, install a global validation pipe, and reject unknown fields. If keeping shared TypeScript DTOs, pair them with Zod/class-validator schemas.

### 2. Storage Misconfiguration Must Fail Explicitly

Severity: Critical

Evidence:
- The storage service now throws when Supabase storage is not configured instead of returning placeholder signed URLs.
- Startup config validation is still incomplete, so a bad deployment can still boot far enough to fail at first storage use.

Impact: this is safer than the previous placeholder behavior, but operators still get a runtime failure instead of a clear boot-time configuration error.

Recommended fix: validate required storage env vars at startup and fail the process with a clear message.

## High Findings

### 4. Auth/Config Is Evaluated Before Runtime Validation

Severity: High

Evidence:
- `backend/src/auth/auth.service.ts:9-13` reads `SUPABASE_URL` and creates the JWKS client at module import time.
- `backend/src/config/env.ts:1-10` defines a TypeScript interface only; no runtime config loader validates required values.
- `backend/src/app.module.ts:26` loads `ConfigModule.forRoot`, but no schema or validator is provided.

Impact: a missing/invalid `SUPABASE_URL` can fail during import with an unclear startup error. Required env vars can be absent while the app still boots partially.

Recommended fix: move config reads behind validated config service access, add startup validation for `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `REDIS_URL`.

### 5. Offline Sync Swallows Errors

Severity: High

Evidence:
- `mobile/src/lib/storage/offline-sync.ts:27-54` catches all sync errors and only increments `failed`.
- The catch block does not persist the error, backoff metadata, terminal failure state, or surface the reason to UI/logging.
- `mobile/src/features/capture/capture-flow.ts:80-85` catches all sync errors and returns `{ synced: false }` without preserving the failure reason.

Impact: user data may remain unsynced without actionable diagnostics. Debugging upload/auth/storage failures will be difficult.

Recommended fix: store last error per queue item, expose sync status in UI, add retry backoff/attempt caps, and log structured failure details.

### 6. Capture Completion Is Not Transactional

Severity: High

Evidence:
- `backend/src/capture/capture.service.ts:62-118` creates `MemoryEvent`, updates `CaptureSession`, updates `Recording`, creates `AiJob`, and enqueues work as separate operations.

Impact: a failure midway can leave a completed session without a recording status update, a memory event without a queued job, or duplicate/partial state on retries.

Recommended fix: group database writes in a Prisma transaction. Treat queue enqueue as an outbox-style step or make retries idempotent with deterministic job keys.

### 7. Mobile API Client Ignores Session Retrieval Errors

Severity: High

Evidence:
- `mobile/src/lib/api/default-client.ts:23-26` calls `supabase.auth.getSession()` and ignores `error`.
- `mobile/src/lib/api/client.ts:20-27` silently omits Authorization when token is missing.

Impact: auth/session failures become anonymous API requests and then generic backend 401s. This obscures the real problem and can cause confusing UX.

Recommended fix: throw or return a typed auth error when session retrieval fails, and centralize handling for expired/missing sessions.

### 8. Upload Reads Entire Audio File Into Memory

Severity: High

Evidence:
- `mobile/src/lib/storage/audio-file-upload.ts:26-34` reads the entire audio file as base64, converts it to a `Uint8Array`, then uploads it.

Impact: longer recordings can spike memory usage, especially on lower-end devices. Base64 conversion also adds overhead.

Recommended fix: use a streaming/file upload API supported by Expo/React Native, or enforce a strict max recording duration until streaming upload is implemented.

## Medium Findings

### 9. Legacy AI Stages Remain In Code And Database

Severity: Medium

Evidence:
- New capture and manual event reprocess flow now uses `transcription -> summary -> timeline_update`.
- Older worker files for classification, action extraction, reminder suggestion, embedding, and insight still exist.
- Queue service methods for those older stages still exist, but they are no longer reached from the primary capture/reprocess path.
- Historical `AiJob` rows still include old completed stage types.

Impact: the current app path is simpler and avoids producing extra action/reminder/insight data, but the codebase still carries unused surface area that can confuse future maintenance.

Recommended fix: keep these legacy workers disabled from the active path for now. If the focused MVP direction is confirmed, remove the unused queues, workers, API surfaces, and database tables through an explicit Prisma migration.

### 10. Web Cannot Be Used For UI Verification

Severity: Medium

Evidence:
- `mobile/app.json:8-11` lists only `ios` and `android`.
- `npm run web` fails because `web` is not in Expo `platforms`.

Impact: browser-based UI regression checks cannot run without changing app config. This slows navigation/design QA.

Recommended fix: either add web support intentionally or document mobile-only verification and add device/emulator screenshots to the QA workflow.

### 11. No Automated Tests Are Present

Severity: Medium

Evidence:
- No repo-local `*.test.*` or `*.spec.*` files were found outside package dependencies.
- Package scripts only expose typecheck/build/start flows; there are no unit/integration/e2e scripts in `mobile/package.json`, `backend/package.json`, or `shared/package.json`.

Impact: auth, capture, sync, queue, and navigation regressions rely on manual testing.

Recommended fix: start with focused tests around capture completion, recording ownership, upload URL failure handling, offline sync retry behavior, and navigation route mapping.

### 12. Shared Package Has Build But No Typecheck Script

Severity: Medium

Evidence:
- `shared/package.json` defines only `build`.
- `cd shared && npm run typecheck` fails with "Missing script".

Impact: root/CI orchestration cannot run a consistent typecheck command across packages.

Recommended fix: add `"typecheck": "tsc --noEmit -p tsconfig.json"` to `shared/package.json`.

### 13. CORS Is Not Configured In Backend Bootstrap

Severity: Medium

Evidence:
- `backend/src/main.ts:5-7` starts the Nest app without `enableCors`.

Impact: mobile web/debug clients or browser-based tools may fail cross-origin requests. If CORS is later opened broadly without policy, it can become a security issue.

Recommended fix: configure CORS explicitly from environment per deployment target.

## Low Findings

### 14. Console Logging In Upload Path

Severity: Low

Evidence:
- `mobile/src/lib/storage/audio-file-upload.ts:19`, `37`, and `47` log upload details.

Impact: logs can become noisy and may leak file/location hints in debug output.

Recommended fix: replace with structured debug logging behind an environment flag.

### 15. Device Surface Is Not Needed For Current MVP

Severity: Low

Evidence:
- Mock dongle startup code has been removed from `mobile/App.tsx`.
- Mock dongle service/hook/storage files were deleted.
- Device management is no longer exposed from bottom navigation.
- Backend database still has `Device` and `DeviceToken` models.

Impact: the current capture experience does not depend on device management. Keeping device models is acceptable if hardware pairing is a near-term feature; otherwise it is extra schema/API weight.

Recommended fix: leave hidden until a real hardware flow is implemented, or remove the device API/schema in a dedicated migration if hardware support is out of scope.

## Current Navigation Refactor Notes

The latest navigation split is structurally sound:
- `mobile/src/app/navigation.ts` contains tab ids, labels, icons, default routes, and `getTabForRoute`.
- `mobile/src/app/AppShell.tsx` now imports `TABS` and `getTabForRoute`, and keeps screen rendering in the shell.
- Bottom navigation is narrowed to Home, Timeline, central Capture, and Search.
- Settings are reached from the top bar, not from bottom tabs.

Remaining navigation considerations:
- Icons are Unicode text symbols. This works, but it is less consistent than a real icon set if the product later adopts one.

## Database And Functionality Scope

Keep for the active MVP:
- `User`, `Recording`, `CaptureSession`, `MemoryEvent`, `Transcript`, `Note`, `DailySummary`, `MemoryThread`, `MemoryThreadEvent`, `AiJob`.

Useful but not required for the first focused release:
- `SyncItem`, if offline queue observability is implemented.
- `Device` and `DeviceToken`, only if real hardware pairing is planned soon.

Hide or remove later if the product remains capture-first:
- `ActionItem`, `Reminder`, `Insight`, `Tag`, `NoteTag`, and unused AI stages for classification/action/reminder/embedding/insight.

Database cleanup performed:
- Mock-marked data cleanup script added as `backend/prisma/cleanup-mock-data.sql`.
- Stale recordings cleanup script added as `backend/prisma/cleanup-stale-recordings.sql`.
- 17 old `Recording.status = 'created'` rows without linked sessions/events were marked `deleted`.

## Recommended Remediation Order

1. Add runtime config validation and fail fast for missing storage/STT/Supabase/Redis settings.
2. Add backend request validation for all write endpoints.
3. Make capture completion transactional or outbox-driven.
4. Improve offline sync error persistence and user-visible status.
5. Add baseline automated tests for capture, recording ownership, storage failure, offline sync, and navigation mapping.
6. Decide whether Expo web is supported; either enable and test it, or document mobile-only QA.
7. Remove legacy tables/workers/API surfaces only after confirming they are out of scope.

## Residual Risk

This audit did not run the app against real Supabase, Redis, storage, or an emulator/device. It also did not perform a dependency vulnerability scan or a security penetration test. Findings are based on static inspection and available local commands.
