# Architecture

The repository uses a simple light-monorepo:

```txt
/mobile
/backend
/shared
/docs
```

No TurboRepo, NX, Kubernetes, microservices, or complex workspace tooling is included.

## Data Flow

```txt
button/manual capture
-> CaptureSession
-> audio recording
-> ContextSnapshot
-> Supabase Storage upload
-> Recording
-> MemoryEvent
-> AI pipeline
-> Note, ActionItem, Reminder
-> timeline and search
```

## Mobile

Mobile is React Native/Expo with TypeScript, Zustand, React Query, Supabase client, and Bluetooth/audio abstraction layers. Production native Bluetooth and audio integration is intentionally left out until hardware behavior is validated.

## Backend

Backend is NestJS with Prisma, Supabase Auth JWT verification, Supabase Postgres, Supabase Storage, Redis, and BullMQ. Modules are organized by product domain rather than infrastructure layers.

The first implemented backend flow persists users by Supabase JWT subject, creates recordings, creates capture sessions with context snapshots, completes captures into Memory Events, and enforces ownership on reads/updates.

Capture completion also creates an `AiJob` and enqueues the first BullMQ step. The current worker path uses a mock transcript and is ready to be replaced by a real speech-to-text provider.

## Shared

`shared` contains only TypeScript types, DTOs, enums, constants, and API contracts. It should not contain app logic or platform-specific code.
