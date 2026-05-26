# Voxa

Voxa is an MVP foundation for a continuity memory system paired with a Bluetooth voice dongle.

The product captures voice through the phone, AirPods/Siri Shortcuts, or a connected dongle, adds context, uploads audio to a backend when available, and turns recordings into Memory Events, Memory Threads, rare Insights, timeline entries, and searchable memory.

Voxa is not a chatbot or productivity dashboard. The primary flow is capture, memory, retrieval, and insight.

## Architecture

This repository intentionally uses a simple light-monorepo layout:

```txt
/mobile   React Native / Expo app skeleton
/backend  NestJS API, Prisma schema, queues and worker skeletons
/shared   TypeScript enums, DTOs, constants and API contracts
/docs     Product and architecture documentation
```

No TurboRepo, NX, Kubernetes, microservices, or complex workspace tooling is included.

## Local Development Plan

1. Install dependencies inside each package once real app setup begins:
   - `cd shared && npm install`
   - `cd backend && npm install`
  - `cd mobile && npm install`
2. Start Supabase locally or configure a hosted Supabase project.
3. Run Prisma migrations from `backend` after converting the schema draft into the first migration.
4. Start Redis for BullMQ workers.
5. Start the backend API and Expo mobile app.

Workers are registered inside the NestJS app for the MVP. Running the backend with `npm run start:dev` also starts the queue processors as long as Redis is reachable.

The current AI pipeline is mock-backed end to end. Capture completion creates a transcription `AiJob`, workers produce mock transcript/note/action/reminder/chunk/daily-summary records, and provider integrations remain TODOs.

Server-side CPU STT can be enabled with `STT_PROVIDER=whisper_http` and `STT_HTTP_ENDPOINT`; see `docs/server-stt.md`.

Mobile local-first scaffolding uses `expo-sqlite` for local memory drafts and the upload queue, NetInfo for reconnect detection, and an upload retry coordinator.

Manual mobile audio recording uses `expo-audio` to create a local recording URI before backend sync. Audio file upload uses `expo-file-system` against backend-generated Supabase signed upload URLs when storage is configured. A mock capture path remains available for fast manual testing.

Mock dongle pairing is wired end to end: the mobile mock dongle can pair through the backend device API, and mock button events trigger local-first capture.

Important hardware constraint: in the MVP, the dongle does not store audio offline. If the phone is powered off or unavailable, a dongle button press cannot create an audio recording; the dongle should provide failure feedback instead.

Planned hardware v2 may add autonomous dongle storage with SPI NOR Flash, encrypted append-only audio chunks, and delayed sync. That work is architecture-only in this repository right now and is not part of MVP v1 runtime behavior.

The mobile app currently uses a simple in-app shell for manual MVP testing across Home, Capture, Device, Timeline, Threads, Insights, Notes, Open Loops, and Search. This is intentionally not polished production navigation.

Manual reprocessing is wired for mock AI: backend `POST /ai/reprocess/:recordingId` and `POST /ai/reprocess-event/:eventId` create `AiJob` records and enqueue the pipeline.

## Environment Variables

Backend:

```txt
DATABASE_URL=
SUPABASE_URL=
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
AI_PROVIDER=
STT_PROVIDER=mock
STT_HTTP_ENDPOINT=
```

Mobile:

```txt
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE_URL=
```

## Next Implementation Steps

1. Wire Supabase Auth in mobile and JWT validation in backend.
2. Implement capture sessions and recording upload URL generation.
3. Add the first Prisma migration and Supabase RLS policies.
4. Connect BullMQ queues to real workers.
5. Add the first AI provider adapter behind the provider interfaces.
6. Replace mock Bluetooth/audio services with production native integrations when hardware is ready.

## Verification

Current scaffold checks:

```txt
shared: npm run build
backend: npm run typecheck
backend: npx prisma generate --schema prisma/schema.prisma
backend: DATABASE_URL=postgresql://user:pass@localhost:5432/voxa npx prisma validate --schema prisma/schema.prisma
backend: npm audit --omit=dev --audit-level=high
mobile: npm run typecheck
mobile: npm audit --omit=dev --audit-level=high
```

Backend audit currently reports zero vulnerabilities. Mobile audit has no high-severity findings; npm reports moderate Expo transitive warnings through `uuid`/`xcode`, and the suggested automatic fix would downgrade Expo, so it is left for Expo upstream updates.
