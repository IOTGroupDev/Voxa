# VOXA — AI MEMORY SYSTEM WITH BLUETOOTH VOICE DONGL E
# MASTER CODEX TASK
# REPLACE PREVIOUS TASKS WITH THIS FILE

---

# PRODUCT VISION

Voxa is NOT:

- a chatbot;
- a диктофон;
- a productivity tracker;
- a second-brain clone;
- a generic AI notes app.

Voxa is:

> a continuity memory system.

The product helps users capture thoughts instantly through voice and gradually builds a long-term contextual memory layer over time.

Core philosophy:

```txt
capture
→ context
→ meaning
→ memory
→ continuity
→ resurfacing
→ insight

The main value is NOT transcription.

The main value is:

continuity of thoughts;
recurring themes;
long-term memory;
semantic connections;
unresolved ideas;
contextual resurfacing;
cognitive augmentation.

The system should feel:

calm;
personal;
private;
minimal;
invisible;
low-friction.

Avoid enterprise/productivity UX patterns.

CRITICAL PRODUCT RULES

IMPORTANT:

Do NOT design Voxa around conversational AI.

This is NOT a chatbot product.

Primary UX:

capture
→ memory
→ retrieval
→ insight

NOT:

question
→ AI answer

Avoid:

chat-centric UX;
copilot UI patterns;
kanban boards;
gamification;
aggressive notifications;
enterprise dashboards;
productivity obsession.

The app should feel like:

a second layer of memory.

HARDWARE CONCEPT

The system includes:

Bluetooth voice dongle

Hardware contains:

microphone;
physical button;
Bluetooth audio connection;
BLE control service;
battery;
LED/vibration indicator.

The dongle exists to reduce friction.

Goal:

press button
→ speak
→ release
→ continue life

The phone handles:

recording;
context collection;
local storage/cache;
upload;
visualization;
memory timeline.
IMPORTANT MVP DECISIONS

MVP MUST NOT include:

always-on recording;
stealth recording;
hidden recording;
realtime transcription;
onboard AI;
BLE file transfer;
offline dongle storage;
complex synchronization;
custom BLE audio streaming;
production-grade BLE firmware;
subscriptions;
enterprise infrastructure.

MVP MUST include architecture for:

Bluetooth microphone input;
BLE button events;
capture sessions;
Memory Events;
AI summaries;
semantic memory;
action extraction;
reminders;
timeline;
semantic search;
insight generation.
PRODUCT EXPERIENCE

The user should feel:

Voxa remembers my thoughts across time.

NOT:

Voxa is an AI assistant.
HIGH LEVEL ARCHITECTURE
Hybrid Local-First Architecture

MVP architecture should follow hybrid local-first principles.

Local responsibilities

Mobile app handles:

capture;
recording;
local queue;
local cache;
temporary offline storage;
timeline rendering;
basic recent memory links;
device state;
BLE control.

The app must remain usable without immediate backend access.

Backend responsibilities

Backend handles:

AI enrichment;
transcription;
embeddings;
long-term memory graph;
semantic search;
reminders;
summaries;
action extraction;
insight generation;
timeline processing.

The backend is:

enhancement layer, not hard dependency for capture UX.

CORE DOMAIN MODEL

The primary entity is NOT Recording.

The primary entity is:

MemoryEvent

A MemoryEvent combines:

audio
+ timestamp
+ context
+ gesture
+ intent
+ AI interpretation
+ semantic meaning

Examples:

Gesture	Meaning
single press	quick note
double press	task/action
long press	important
hold	recording while held
manual app record	manual capture
MEMORY THREADS

The system must build long-term thematic threads.

Examples:

"hardware ideas"
"privacy concerns"
"voice workflows"
"unfinished project"
"startup direction"
"relationship reflections"

Each thread tracks:

first appearance;
latest activity;
frequency;
unresolved questions;
progress;
emotional tone;
semantic similarity.
INSIGHT ENGINE

Insights are extremely important.

Insights must be:

rare;
meaningful;
contextual;
non-spammy.

The AI should speak rarely but intelligently.

Examples:

"You returned to this idea 7 times in 2 months."

"This thought is highly similar to a note from May 12."

"Most recordings about Voxa contain the same unresolved issue: battery, privacy and BLE UX."

"This appears to be a long-term recurring direction rather than a temporary idea."
UX PRINCIPLES

The app should feel:

calm;
thoughtful;
quiet;
personal;
emotionally neutral;
respectful.

Do NOT optimize for:

dopamine;
engagement addiction;
notification spam;
productivity pressure.

The app should NOT feel like:

Jira;
Slack;
Notion;
ChatGPT wrapper;
CRM;
corporate dashboard.
MONOREPO STRUCTURE

Use SIMPLE monorepo structure only.

Do NOT use:

TurboRepo;
NX;
Kubernetes;
microservices;
complex workspace tooling.

Structure:

/mobile
/backend
/shared
/docs
TECH STACK
Mobile

Use:

React Native;
Expo SDK 54+;
TypeScript;
Zustand;
React Query;
Supabase client;
SQLite;
Bluetooth abstraction layer.

Create architecture and mocks first.

Do NOT implement production native BLE/audio integration yet.

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
AI PROVIDER ARCHITECTURE

Do NOT hardcode one provider.

Create abstractions for:

speech-to-text;
summarization;
embeddings;
classification;
action extraction;
reminder suggestions;
insight generation.

Interfaces:

interface SpeechToTextProvider {
  transcribe(audioUri: string): Promise<TranscriptionResult>;
}

interface SummaryProvider {
  summarize(text: string): Promise<string>;
}

interface EmbeddingProvider {
  createEmbedding(text: string): Promise<number[]>;
}

interface ActionExtractionProvider {
  extract(text: string): Promise<ActionItem[]>;
}

interface ReminderSuggestionProvider {
  suggest(text: string): Promise<ReminderSuggestion[]>;
}

interface EventClassificationProvider {
  classify(text: string): Promise<MemoryEventType>;
}

Create mock providers.

No production AI integration yet.

SUPABASE

Use Supabase for:

Auth;
Postgres;
Storage;
pgvector;
RLS.

Do NOT create custom auth.

Flow:

Mobile
→ Supabase Auth
→ JWT
→ Backend verifies JWT
→ Product APIs
MOBILE STRUCTURE
/mobile
  /src
    /app
    /features
      /auth
      /capture
      /timeline
      /memory-events
      /memory-threads
      /notes
      /actions
      /reminders
      /search
      /insights
      /devices
      /settings
    /lib
      /supabase
      /api
      /bluetooth
      /audio
      /context
      /storage
      /memory
    /state
    /types
BACKEND STRUCTURE
/backend
  /src
    /auth
    /users
    /devices
    /capture
    /recordings
    /memory-events
    /memory-threads
    /transcripts
    /notes
    /actions
    /reminders
    /timeline
    /search
    /insights
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
SHARED STRUCTURE
/shared
  /src
    /types
    /dto
    /enums
    /constants
    index.ts
MAIN DATABASE MODELS

Create Prisma draft schema for:

User
Device
Recording
MemoryEvent
MemoryThread
ContextSnapshot
Transcript
Note
NoteChunk
Tag
NoteTag
ActionItem
Reminder
Insight
DailySummary
AiJob
SyncItem

All models require:

id;
timestamps;
ownership;
indexes;
status fields;
relations.
MEMORY EVENT MODEL

MemoryEvent includes:

recording_id
user_id
event_type
capture_source
button_gesture
transcript_id
note_id
context_snapshot_id
summary
importance_score
emotional_score optional
semantic_hash optional
processing_status
MEMORY THREAD MODEL

Tracks recurring semantic themes.

Fields:

title
description
first_seen_at
last_seen_at
notes_count
importance_score
unresolved_count
emotional_trend optional
semantic_cluster_id optional
INSIGHT MODEL

Insights are generated rarely.

Types:

recurring_theme
unresolved_question
similar_past_note
project_direction
emotional_pattern
forgotten_task
decision_needed

Fields:

title
body
type
related_thread_id
related_note_ids
importance_score
is_read
CONTEXT SNAPSHOT

Collect limited privacy-first context.

Possible fields:

timestamp
timezone
location optional
device_state
app_state
capture_source
button_gesture
nearby_device_id
selected_project optional

Do NOT overcollect personal data.

Privacy-first defaults only.

STORAGE

Use Supabase Storage.

Buckets:

audio-private
user-media

Audio MUST remain private.

Backend later generates signed URLs.

Create:

storage abstraction;
upload URL scaffold;
metadata model.
BLUETOOTH ARCHITECTURE

IMPORTANT:

For MVP:

Audio = Bluetooth microphone/audio profile
Control = BLE custom service

Do NOT design custom BLE audio streaming.

BLE STRUCTURE
/mobile/src/lib/bluetooth

Contains:

DongleConnection
DongleControlService
DongleButtonEvents
DongleBatteryStatus
DongleRecordingState
BluetoothAudioInput
MockDongleService

Use TypeScript interfaces + mocks.

No native implementation yet.

SUPPORTED DONGLE STATES
disconnected
connecting
connected
recording
low_battery
error
SUPPORTED BUTTON EVENTS
SINGLE_PRESS
DOUBLE_PRESS
LONG_PRESS
PRESS_AND_HOLD_START
PRESS_AND_HOLD_END
BLE SERVICE DESIGN

Document:

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
CAPTURE FLOW
User presses dongle button
→ mobile receives BLE event
→ mobile starts recording from Bluetooth microphone
→ mobile creates local CaptureSession
→ mobile collects ContextSnapshot
→ recording stops
→ audio locally cached
→ upload queued
→ backend creates Recording + MemoryEvent
→ AI pipeline triggered
→ transcript generated
→ note generated
→ actions extracted
→ reminders suggested
→ timeline updated
→ semantic memory updated
→ insights possibly generated
MOBILE MVP SCREENS

Create placeholders + architecture for:

Auth
Home
Capture
Timeline
MemoryEventDetails
NoteDetails
MemoryThreads
Insights
Actions
Reminders
Search
DeviceManagement
Settings

Do NOT create polished UI yet.

Navigation-ready placeholders only.

TIMELINE EXPERIENCE

Timeline is NOT just recordings.

Timeline should feel like:

semantic history of thoughts.

Each item may show:

summary;
tags;
related memories;
importance;
unresolved state;
related thread;
semantic resurfacing.
MEMORY ENGINE

Create:

memory.service.ts

Responsibilities:

process new event;
normalize transcript;
generate summary;
extract tags;
classify type;
find similar memories;
attach to thread;
update thread statistics;
generate insight if needed.
INSIGHT ENGINE

Create:

insight.service.ts

Rules:

Generate insights ONLY if:

recurring topic detected;
strong semantic similarity;
unresolved issue repeated;
important note pattern found;
user explicitly marked importance.

Insights must remain low-frequency.

AI PIPELINE

Create worker skeletons:

transcription.worker.ts
summary.worker.ts
embedding.worker.ts
classification.worker.ts
action-extraction.worker.ts
reminder-suggestion.worker.ts
insight.worker.ts
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
→ insight_queue
→ completed

No real AI provider implementation yet.

Use TODO markers.

MOBILE LOCAL-FIRST BEHAVIOR

Capture must work even if backend unavailable.

Requirements:

local recording cache;
upload queue;
retry logic;
temporary local timeline;
graceful offline behavior.
API CONTRACT

Scaffold/document endpoints.

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

Document:

purpose;
request body;
response body;
auth requirements;
errors.
SECURITY & PRIVACY

Architecture MUST support:

encrypted transport;
private audio storage;
RLS by user_id;
optional audio deletion;
export/delete account;
explicit permissions;
visible recording indicators;
no stealth recording;
no always-on recording;
user retention settings.

IMPORTANT:

Recording state must always be visible.

Dongle should provide:

LED indication;
or vibration indication.
RLS POLICY STYLE

Document intended policy style:

user_id = auth.uid()

For all user-owned entities.

Storage:

private buckets;
path contains user_id;
access only to own files.
DOCUMENTATION FILES

Create:

/docs/product.md
/docs/architecture.md
/docs/database-schema.md
/docs/api-contract.md
/docs/bluetooth-protocol.md
/docs/ai-pipeline.md
/docs/security-privacy.md
/docs/memory-engine.md
/docs/mvp-roadmap.md
/docs/codex-notes.md
README

README must explain:

product philosophy;
architecture;
structure;
local development;
env variables;
next implementation steps.
QUALITY REQUIREMENTS

Keep architecture:

realistic;
simple;
maintainable;
modular;
production-oriented.

Avoid:

enterprise overengineering;
premature abstractions;
fake production implementations.

Prefer:

mocks;
interfaces;
TODO markers;
clear module boundaries.

Use:

TypeScript strict mode;
readable code;
consistent naming.
MVP DEFINITION OF DONE

Task complete when:

project structure exists;
docs exist;
backend module skeletons exist;
Prisma schema draft exists;
shared types/enums/DTOs exist;
Bluetooth mock abstraction exists;
capture architecture exists;
MemoryEvent architecture exists;
MemoryThread architecture exists;
Insight architecture exists;
AI worker skeletons exist;
API contract documented;
privacy/security documented;
README updated;
no unnecessary tooling added.
FINAL RESPONSE REQUIREMENTS

After implementation summarize:

files created;
architecture decisions;
intentionally skipped parts;
risks/unknowns;
next implementation priorities.