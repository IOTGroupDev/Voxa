# Product

Voxa is an external memory system built around fast voice capture, context, AI interpretation, actions, reminders, timeline, and search.

The MVP supports two capture sources:

- mobile app manual recording;
- Bluetooth dongle trigger with mocked control events.

The core product object is `MemoryEvent`, not `Recording`. A recording is the audio artifact. A Memory Event combines audio, button gesture, timestamp, context, inferred intent, transcript, note, actions, reminders, and timeline placement.

## Dongle Role

The dongle is a connected microphone and control device. For MVP architecture it has:

- microphone over Bluetooth audio profile;
- physical button;
- BLE control channel;
- battery status;
- LED/vibration recording indicator.

The dongle does not store audio offline and does not sync files.

## Mobile Role

The mobile app receives audio, manages recording sessions, listens for BLE button events, collects privacy-first context, queues uploads, and displays memory, actions, reminders, timeline, and search.

## Backend Role

The backend validates Supabase Auth JWTs, orchestrates Supabase Storage, persists the domain model, runs BullMQ jobs, invokes AI providers, updates timeline/search projections, and enforces privacy behavior.

