# Voxa

Voxa is an MVP foundation for an AI memory app paired with a Bluetooth microphone dongle.

The product captures voice through the phone or a connected dongle, adds context, uploads audio to a backend, and turns recordings into Memory Events, notes, actions, reminders, timeline entries, and searchable memory.

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

## Environment Variables

Backend:

```txt
DATABASE_URL=
SUPABASE_URL=
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
AI_PROVIDER=
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
