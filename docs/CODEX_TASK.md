# Codex Task: Build MVP Architecture for AI Memory App with Hardware Dongle

## Product

We are building a standalone AI memory/logging app with a small BLE hardware dongle.

This is NOT AstraLink.  
This is NOT Reflecta.

The product should allow a user to:
- record quick voice notes;
- trigger recording from a BLE dongle button;
- transcribe audio;
- generate AI summaries;
- extract tags and action items;
- build a searchable personal timeline;
- later support a wearable/dongle ecosystem.

Do not overengineer.  
Build a realistic MVP foundation.

---

## Main Architecture Decision

Use a simple light-monorepo structure:

```txt
/mobile
/backend
/shared
/docs

Do NOT use TurboRepo, NX, microservices, Kubernetes, or complex workspace tooling yet.

Use shared code only for:

TypeScript types;
DTOs;
enums;
constants;
API contracts.
Tech Stack
Mobile

Use:

React Native;
Expo SDK 54+;
TypeScript;
Zustand;
React Query;
Supabase Auth client;
BLE abstraction layer.

Do not implement real BLE native code yet.
Create interfaces and mock implementation.

Backend

Use:

NestJS;
TypeScript;
Supabase Auth JWT verification;
Supabase Postgres;
Supabase Storage;
Prisma;
Redis;
BullMQ.
AI

Use a queue-based pipeline:

recording_uploaded
→ transcription_queue
→ summary_queue
→ embedding_queue
→ timeline_update

Do not hardcode one AI provider deeply.
Create provider abstraction.

Supabase Usage

Use Supabase as infrastructure foundation:

Supabase Auth;
Supabase Postgres;
Supabase Storage;
pgvector;
RLS policies.

Do NOT build custom authentication.

The mobile app authenticates through Supabase.

The backend verifies Supabase JWT and exposes product-specific API.

Target Structure

Create or prepare this structure:

/mobile
  /src
    /app
    /features
      /auth
      /recordings
      /notes
      /timeline
      /search
      /devices
      /settings
    /lib
      /supabase
      /api
      /ble
      /storage
    /state
    /types

/backend
  /src
    /auth
    /users
    /devices
    /recordings
    /transcripts
    /notes
    /timeline
    /search
    /ai
    /storage
    /queue
    /workers
    /privacy
    /config
    app.module.ts
    main.ts
  /prisma
    schema.prisma

/shared
  /src
    /types
    /dto
    /enums
    /constants
    index.ts

/docs
Backend Modules

Create skeleton NestJS modules for:

auth
users
devices
recordings
transcripts
notes
timeline
search
ai
storage
queue
workers
privacy

Each module should have:

module file;
service file;
controller file where applicable;
DTOs where useful;
TODO comments for implementation.

Do not implement full business logic yet.

Database Schema Draft

Create Prisma schema draft for:

User
Device
Recording
Transcript
Note
NoteChunk
Tag
NoteTag
DailySummary
Event
AiJob
SyncItem

Include:

IDs;
user ownership;
timestamps;
indexes;
status enums;
relations.

Important statuses:

RecordingStatus:
- created
- uploading
- uploaded
- processing
- completed
- failed
- deleted

AiJobStatus:
- pending
- processing
- completed
- failed
- retrying
- cancelled
Storage

Create documentation and backend abstraction for Supabase Storage.

Buckets:

audio-private
user-media

Audio files must be private.

Backend should later create signed upload/download URLs.

API Contract

Document and scaffold REST API endpoints:

GET /users/me

POST /devices/pair
GET /devices
GET /devices/:id
PATCH /devices/:id
DELETE /devices/:id

POST /recordings
POST /recordings/:id/upload-url
PATCH /recordings/:id/status
GET /recordings
GET /recordings/:id
DELETE /recordings/:id

GET /notes
GET /notes/:id
PATCH /notes/:id
DELETE /notes/:id

GET /timeline
GET /search?q=
GET /daily-summary/:date

POST /ai/reprocess/:recordingId

For documentation include:

purpose;
request body;
response body;
auth requirement;
possible errors.
BLE Layer

Do not implement native BLE yet.

Create:

/mobile/src/lib/ble

With:

BLE device interface;
mock BLE service;
device event types;
recording trigger event.

Document expected BLE protocol:

Service:

MemoryDongleService

Characteristics:

battery_level
device_status
record_command
event_marker
firmware_version

Commands:

START_RECORD
STOP_RECORD
MARK_IMPORTANT
GET_STATUS
GET_BATTERY
OTA_UPDATE

MVP dongle should send only:

button events;
battery state;
connection status.

No BLE audio streaming in MVP.

Mobile MVP Screens

Create screen/component placeholders for:

Auth
Home
Timeline
NoteDetails
Search
DeviceManagement
Settings

Do not implement final UI.
Create clean placeholders and navigation-ready structure.

AI Pipeline

Create backend AI abstraction:

AiProvider
SpeechToTextProvider
EmbeddingProvider
SummaryProvider

Create worker skeletons:

transcription.worker.ts
summary.worker.ts
embedding.worker.ts
cleanup.worker.ts

Use BullMQ architecture.

No real provider integration yet.
Add TODO comments for OpenAI/Whisper-compatible/STT provider.

Security and Privacy

Document architecture support for:

encrypted transport;
private audio storage;
RLS by user_id;
optional audio auto-delete after transcription;
user data export;
account deletion;
no stealth recording;
visible recording indication;
no always-on recording in MVP.
Documentation Deliverables

Create:

/docs/product.md
/docs/architecture.md
/docs/database-schema.md
/docs/api-contract.md
/docs/ble-protocol.md
/docs/ai-pipeline.md
/docs/security-privacy.md
/docs/mvp-roadmap.md
MVP Scope

MVP includes:

manual voice note recording from mobile app;
BLE button trigger mock;
audio upload architecture;
transcription job architecture;
AI summary architecture;
tags;
action items;
timeline;
semantic search architecture;
daily summary architecture.

MVP does NOT include:

always-on recording;
stealth recording;
BLE audio streaming;
realtime transcription;
speaker diarization;
edge AI on dongle;
subscriptions;
hardware OTA implementation;
production mobile UI polish.
Quality Requirements
Keep architecture realistic.
Keep structure simple.
Avoid enterprise complexity.
Use TypeScript.
Use clean module boundaries.
Prefer readable code over clever abstractions.
Add TODO markers.
Add short README instructions.
Do not break existing project if repo already has files.
Definition of Done

The task is complete when:

Project structure exists.
Docs are created.
Backend module skeleton exists.
Prisma schema draft exists.
Shared types/enums/DTOs exist.
BLE mock abstraction exists.
AI worker skeleton exists.
API contract is documented.
README explains how to continue.
No unnecessary complex monorepo tooling is added.
Final Response

After completing, summarize:

files created;
main architecture decisions;
what was intentionally left out;
next implementation steps.
