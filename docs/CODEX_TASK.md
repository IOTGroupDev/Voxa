# Codex Task: AI Memory App with Bluetooth Microphone Dongle

## Product

We are building a standalone AI memory/logging app with a small physical Bluetooth dongle.

This is NOT AstraLink.  
This is NOT Reflecta.

The product is not just STT notes.

The goal is to create an external memory system:

```txt
voice capture
→ context
→ meaning
→ actions
→ timeline
→ reminders
→ searchable memory
Core Product Idea

The hardware dongle has:

microphone;
physical button;
Bluetooth audio connection;
BLE control channel;
battery;
LED/vibration indicator.

For MVP, the dongle works only when connected to the phone.

The phone is responsible for:

receiving audio from the dongle;
recording/buffering audio;
uploading audio to backend;
collecting context;
displaying notes, actions, timeline and search.

The backend is responsible for:

auth validation;
storage orchestration;
AI pipeline;
event processing;
timeline generation;
search.
Important MVP Decisions

Do NOT implement:

offline audio storage on dongle;
BLE file synchronization;
audio chunk manifest;
sync resume;
onboard AI;
always-on recording;
stealth recording;
realtime transcription.

Do implement architecture for:

Bluetooth microphone input;
BLE button events;
Memory Events;
AI summaries;
action extraction;
reminders;
timeline;
semantic search.
Architecture
Bluetooth Dongle
  ├─ Bluetooth audio profile for microphone
  └─ BLE service for button/battery/status

Mobile App
  ├─ audio recording
  ├─ BLE control connection
  ├─ local queue/cache
  ├─ context collection
  └─ upload to backend

Backend
  ├─ Supabase Auth JWT validation
  ├─ Supabase Storage orchestration
  ├─ Postgres/Prisma data model
  ├─ BullMQ queues
  ├─ AI pipeline
  └─ timeline/search/actions
Repository Structure

Use simple light-monorepo structure:

/mobile
/backend
/shared
/docs

Do NOT use:

TurboRepo;
NX;
Kubernetes;
microservices;
complex workspace tooling.

Shared code should be limited to:

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
Supabase client;
Bluetooth/BLE abstraction layer.

Create architecture and mock implementations first.

Do not implement production native BLE/audio integration yet.

Backend

Use:

NestJS;
TypeScript;
Prisma;
Supabase Auth JWT verification;
Supabase Postgres;
Supabase Storage;
Redis;
BullMQ.
AI

Create provider abstractions for:

speech-to-text;
summarization;
embeddings;
action extraction;
reminder suggestion;
classification.

Do not hardcode one AI provider deeply.

Supabase Usage

Use Supabase as infrastructure foundation:

Supabase Auth;
Supabase Postgres;
Supabase Storage;
pgvector;
RLS policies.

Do NOT build custom authentication.

The mobile app authenticates through Supabase.

The backend verifies Supabase JWT and exposes product-specific APIs.

Target File Structure

Create or prepare:

/mobile
  /src
    /app
    /features
      /auth
      /capture
      /recordings
      /memory-events
      /notes
      /actions
      /reminders
      /timeline
      /search
      /devices
      /settings
    /lib
      /supabase
      /api
      /bluetooth
      /audio
      /context
      /storage
    /state
    /types

/backend
  /src
    /auth
    /users
    /devices
    /capture
    /recordings
    /memory-events
    /transcripts
    /notes
    /actions
    /reminders
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
Core Domain Model

The main product object is not just Recording.

The main object is:

MemoryEvent

A Memory Event combines:

audio
+ button gesture
+ timestamp
+ context
+ intent
+ AI interpretation

Examples:

single press      → quick memory capture
double press      → task/action capture
long press        → important memory
press and hold    → record while held
manual app record → manual capture
Shared Enums

Create shared enums for:

export enum MemoryEventType {
  QUICK_NOTE = 'quick_note',
  TASK = 'task',
  IDEA = 'idea',
  IMPORTANT = 'important',
  REFLECTION = 'reflection',
  MEETING = 'meeting',
  MANUAL = 'manual',
}

export enum CaptureSource {
  DONGLE = 'dongle',
  MOBILE_APP = 'mobile_app',
}

export enum ButtonGesture {
  SINGLE_PRESS = 'single_press',
  DOUBLE_PRESS = 'double_press',
  LONG_PRESS = 'long_press',
  PRESS_AND_HOLD = 'press_and_hold',
}

export enum RecordingStatus {
  CREATED = 'created',
  RECORDING = 'recording',
  UPLOADING = 'uploading',
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export enum AiJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}
Backend Modules

Create skeleton NestJS modules for:

auth
users
devices
capture
recordings
memory-events
transcripts
notes
actions
reminders
timeline
search
ai
storage
queue
workers
privacy

Each module should include:

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
MemoryEvent
ContextSnapshot
Transcript
Note
NoteChunk
Tag
NoteTag
ActionItem
Reminder
DailySummary
AiJob
SyncItem

Each table/model should include:

id;
user ownership;
timestamps;
relations;
indexes;
status fields where needed.

Important relationships:

User -> Device[]
User -> Recording[]
User -> MemoryEvent[]
MemoryEvent -> Recording?
MemoryEvent -> ContextSnapshot?
MemoryEvent -> Note?
Note -> ActionItem[]
Note -> Reminder[]
Note -> NoteChunk[]
Context Snapshot

Add model/interface for context collected by mobile app:

ContextSnapshot

It may include:

timestamp
timezone
location optional
calendar_context optional
device_state
app_state
capture_source
button_gesture
nearby_device_id
user_selected_project optional

Do not over-collect sensitive data.
Use privacy-first defaults.

Storage

Use Supabase Storage.

Buckets:

audio-private
user-media

Audio files must be private.

Backend should later generate signed upload/download URLs.

For MVP architecture, create:

storage service abstraction;
upload URL endpoint scaffold;
file metadata model.
Bluetooth Architecture

Create mobile abstraction:

/mobile/src/lib/bluetooth

It should include:

DongleConnection
DongleControlService
DongleButtonEvents
DongleBatteryStatus
DongleRecordingState
BluetoothAudioInput
MockDongleService

Do not implement real native BLE yet.

Create TypeScript interfaces and mock service.

Supported dongle states:

disconnected
connecting
connected
recording
low_battery
error

Supported button events:

SINGLE_PRESS
DOUBLE_PRESS
LONG_PRESS
PRESS_AND_HOLD_START
PRESS_AND_HOLD_END
Bluetooth Design Decision

For MVP architecture, assume:

Audio → Bluetooth microphone/audio profile
Control → BLE custom service

Do not design custom BLE audio streaming yet.

BLE service is only for:

button events;
battery;
connection status;
recording indicator;
basic device metadata.
Expected BLE Service

Document expected BLE service:

MemoryDongleControlService

Characteristics:

device_status
battery_level
button_event
recording_state
firmware_version
device_id

Commands:

GET_STATUS
GET_BATTERY
SET_RECORDING_INDICATOR_ON
SET_RECORDING_INDICATOR_OFF
VIBRATE
PING
Capture Flow

Implement/document MVP flow:

User presses dongle button
→ mobile receives BLE button event
→ mobile starts audio recording using Bluetooth microphone input
→ mobile creates local CaptureSession
→ mobile collects ContextSnapshot
→ mobile stops recording based on gesture or user action
→ mobile uploads audio to backend/Supabase Storage
→ backend creates Recording and MemoryEvent
→ backend enqueues AI pipeline
→ transcript is generated
→ note is generated
→ action items are extracted
→ reminders are suggested
→ timeline is updated
Mobile MVP Screens

Create placeholder screens/components for:

Auth
Home
Capture
Timeline
MemoryEventDetails
NoteDetails
Actions
Reminders
Search
DeviceManagement
Settings

Do not implement final UI.
Create clean placeholders and navigation-ready structure.

Mobile Features

Create architecture for:

auth session
device pairing
dongle status
recording session
local upload queue
capture history
timeline
actions inbox
reminder suggestions
semantic search
settings/privacy
AI Pipeline

Create backend AI abstraction:

SpeechToTextProvider
SummaryProvider
EmbeddingProvider
ActionExtractionProvider
ReminderSuggestionProvider
EventClassificationProvider

Create worker skeletons:

transcription.worker.ts
summary.worker.ts
embedding.worker.ts
action-extraction.worker.ts
reminder-suggestion.worker.ts
timeline.worker.ts
cleanup.worker.ts

Pipeline:

recording_uploaded
→ transcription_queue
→ transcript_created
→ classification_queue
→ summary_queue
→ action_extraction_queue
→ reminder_suggestion_queue
→ embedding_queue
→ timeline_update_queue
→ completed

No real provider integration yet.

Add TODO comments for OpenAI/Whisper-compatible/STT provider.

API Contract

Document and scaffold REST API endpoints.

Users
GET /users/me
Devices
POST /devices/pair
GET /devices
GET /devices/:id
PATCH /devices/:id
DELETE /devices/:id
Capture
POST /capture/session
PATCH /capture/session/:id/complete
PATCH /capture/session/:id/cancel
Recordings
POST /recordings
POST /recordings/:id/upload-url
PATCH /recordings/:id/status
GET /recordings
GET /recordings/:id
DELETE /recordings/:id
Memory Events
POST /memory-events
GET /memory-events
GET /memory-events/:id
PATCH /memory-events/:id
DELETE /memory-events/:id
Notes
GET /notes
GET /notes/:id
PATCH /notes/:id
DELETE /notes/:id
Actions
GET /actions
PATCH /actions/:id
DELETE /actions/:id
Reminders
GET /reminders
POST /reminders
PATCH /reminders/:id
DELETE /reminders/:id
Timeline
GET /timeline
GET /daily-summary/:date
Search
GET /search?q=
AI
POST /ai/reprocess/:recordingId
POST /ai/reprocess-event/:eventId

For documentation include:

purpose;
request body;
response body;
auth requirement;
possible errors.
Security and Privacy

Architecture must support:

encrypted transport;
private audio storage;
Supabase RLS by user_id;
optional audio auto-delete after transcription;
user data export;
account deletion;
no stealth recording;
visible recording indicator;
no always-on recording in MVP;
explicit permission model for microphone and Bluetooth;
user-controlled retention settings.

Important:

The app must clearly communicate when recording is active.

The device should have LED or vibration indication for recording state.

RLS Policy Documentation

Document intended Supabase RLS policy style:

user_id = auth.uid()

For all user-owned tables.

For Storage:

private bucket;
path should include user id;
user can access only own files.
Documentation Deliverables

Create:

/docs/product.md
/docs/architecture.md
/docs/database-schema.md
/docs/api-contract.md
/docs/bluetooth-protocol.md
/docs/ai-pipeline.md
/docs/security-privacy.md
/docs/mvp-roadmap.md
/docs/codex-notes.md
README

Create or update README with:

product overview
architecture overview
folder structure
local development plan
environment variables
next implementation steps
MVP Scope

MVP includes:

Supabase Auth architecture;
Bluetooth dongle abstraction;
mock dongle events;
Bluetooth microphone input architecture;
manual app recording architecture;
capture sessions;
Memory Events;
audio upload architecture;
transcription job architecture;
AI summary architecture;
action item extraction architecture;
reminder suggestion architecture;
timeline architecture;
semantic search architecture;
privacy settings architecture.

MVP does NOT include:

production BLE implementation;
production Bluetooth audio implementation;
offline dongle storage;
BLE file synchronization;
realtime transcription;
always-on recording;
stealth recording;
speaker diarization;
edge AI on dongle;
subscriptions;
hardware OTA implementation;
polished final UI.
Quality Requirements
Keep architecture realistic.
Keep structure simple.
Avoid enterprise complexity.
Do not add TurboRepo/NX.
Do not add Kubernetes.
Use TypeScript.
Use clean module boundaries.
Prefer readable code over clever abstractions.
Add TODO markers.
Add short README instructions.
Do not break existing project if repo already has files.
Prefer mock interfaces over fake incomplete production implementations.
Definition of Done

The task is complete when:

Project structure exists.
Docs are created.
Backend module skeleton exists.
Prisma schema draft exists.
Shared types/enums/DTOs exist.
Bluetooth dongle mock abstraction exists.
Capture session architecture exists.
MemoryEvent architecture exists.
AI worker skeleton exists.
API contract is documented.
Security/privacy model is documented.
README explains how to continue.
No unnecessary complex monorepo tooling is added.
Final Response

After completing, summarize:

files created;
main architecture decisions;
what was intentionally left out;
risks/unknowns;
next implementation steps.
