# Product

Voxa is a continuity memory system built around fast voice capture, context, meaning, long-term memory, resurfacing, and insight.

The MVP supports three capture start paths:

- phone: a large in-app "leave note" button;
- AirPods/Siri Shortcuts: "Hey Siri, leave a note in Voxa" routes into the same capture model;
- Voxa dongle: a branded physical button with mocked control events until hardware is ready.

The core product object is `MemoryEvent`, not `Recording`. A recording is the audio artifact. A Memory Event combines audio, button gesture, timestamp, context, inferred intent, transcript, note, semantic meaning, thread membership, and timeline placement.

Voxa is not a chatbot, copilot, dashboard, productivity tracker, or generic notes app. The primary UX is capture, memory, retrieval, and insight.

## Dongle Role

The dongle is a connected microphone and control device. For MVP architecture it has:

- microphone over Bluetooth audio profile;
- physical button;
- BLE control channel;
- battery status;
- LED/vibration recording indicator.

The dongle does not store audio offline and does not sync files.

If the phone is powered off or cannot receive the button event, the phone-recording MVP cannot create an audio recording. Reliable off-phone capture requires future autonomous dongle storage with local recording and later sync; architecture notes live in `docs/dongle-storage.md`.

## Mobile Role

The mobile app receives audio, manages recording sessions, listens for BLE button events, collects privacy-first context, queues uploads, and displays memory, actions, reminders, timeline, and search.

## AirPods And Shortcuts Role

AirPods do not create a separate recording backend. They are a hands-free trigger path through iOS Shortcuts/Siri into Voxa's phone-side capture flow. In MVP this is modeled as `airpods_shortcut`; native App Intent/Shortcut wiring remains a platform integration task.

## Backend Role

The backend validates Supabase Auth JWTs, orchestrates Supabase Storage, persists the domain model, runs BullMQ jobs, invokes AI providers, updates timeline/search projections, and enforces privacy behavior.
