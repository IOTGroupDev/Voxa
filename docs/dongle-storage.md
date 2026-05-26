# ADDITIONAL CODEX TASK: Autonomous Dongle Storage Mode

Extend Voxa architecture to support future autonomous audio capture on the dongle.

## Goal

The dongle should eventually be able to capture and store short voice notes even when:

- phone is turned off;
- phone is locked;
- app is killed;
- Bluetooth connection is unavailable;
- backend is unavailable.

Core UX:

```txt
press button
→ speak
→ release
→ audio is safely stored on dongle
→ sync later when phone is available
```

The product promise:

a thought should not be lost because the phone was unavailable.

Important Scope

Do NOT implement firmware yet.

Do NOT implement real storage drivers yet.

Do NOT implement real BLE file transfer yet.

This task is architecture and documentation only.

Create interfaces, models, protocol docs and TODOs.

Hardware Direction

Prefer:

nRF52840 or nRF5340;
PDM/I2S microphone;
external SPI NOR Flash;
LiPo battery;
charging IC;
LED/vibration indicator.

Avoid SD card for MVP.

Reason:

SD adds mechanical complexity;
higher power spikes;
filesystem corruption risk;
larger device size;
unnecessary capacity for short voice notes.

Recommended storage:

16MB or 32MB SPI NOR Flash.

This should be enough for many short voice captures using compressed or low-bitrate audio.

Storage Principle

Use append-only storage design.

Do NOT assume normal filesystem.

Concept:

DEVICE_STORAGE
  HEADER
  EVENT_RECORD
  AUDIO_CHUNK
  AUDIO_CHUNK
  EVENT_RECORD
  AUDIO_CHUNK
  ...

Why:

simpler firmware;
safer recovery;
less corruption risk;
easier sync;
easier mark-as-synced logic.
Firmware-Level Concepts To Document

Create /docs/dongle-storage.md.

Document:

autonomous capture mode;
append-only log structure;
recording metadata;
chunked audio storage;
sync states;
corruption recovery;
storage capacity estimates;
encryption-at-rest requirement;
secure erase requirement;
battery implications;
what is intentionally out of MVP.
Recording Metadata

Each stored recording should conceptually have:

local_recording_id;
device_id;
created_at_device_time;
duration_ms;
audio_codec;
sample_rate;
byte_size;
checksum;
sync_status;
button_gesture;
battery_level_at_capture;
firmware_version;
optional error_flags.
Sync Status

Define enum:

export enum DongleRecordingSyncStatus {
  STORED_ON_DEVICE = 'stored_on_device',
  METADATA_SYNCED = 'metadata_synced',
  TRANSFER_IN_PROGRESS = 'transfer_in_progress',
  TRANSFERRED_TO_PHONE = 'transferred_to_phone',
  UPLOADED_TO_BACKEND = 'uploaded_to_backend',
  CONFIRMED_BY_BACKEND = 'confirmed_by_backend',
  SAFE_TO_DELETE_FROM_DEVICE = 'safe_to_delete_from_device',
  SYNC_FAILED = 'sync_failed',
}
Mobile App Architecture

Add future support for dongle-stored recordings.

Create interfaces in:

/mobile/src/lib/bluetooth/storage

Suggested files:

dongle-storage.types.ts
dongle-sync.service.ts
mock-dongle-storage.service.ts
dongle-recording-manifest.ts

Interfaces should support:

list recordings stored on dongle;
fetch recording metadata;
request audio chunks;
confirm chunk received;
mark recording transferred;
mark safe to delete;
handle failed sync;
resume interrupted sync.
BLE Sync Concept

Do NOT design custom BLE audio streaming for live recording.

But document future offline sync protocol.

Sync flow:

phone connects
→ request dongle manifest
→ compare with local known recordings
→ request missing metadata
→ request missing chunks
→ verify checksums
→ store locally
→ upload to backend
→ backend confirms
→ mark safe to delete on dongle
Chunk Transfer Concept

Each audio file should be transferred in chunks.

Conceptual fields:

recording_id;
chunk_index;
total_chunks;
offset;
size;
checksum;
payload.

Do not implement real binary protocol yet.

Create TypeScript DTOs only.

Backend Model Extension

Extend backend data model draft with support for device-origin offline recordings.

Add fields where appropriate:

Recording
device_local_recording_id optional;
original_device_id optional;
captured_offline boolean;
dongle_sync_status optional;
device_created_at optional;
device_duration_ms optional;
device_audio_codec optional;
device_checksum optional.
Device

Add:

storage_capacity_bytes optional;
storage_used_bytes optional;
supports_offline_capture boolean;
firmware_storage_version optional.
New Domain Entity

Add model/interface:

DongleRecordingManifestItem

Fields:

device_id;
local_recording_id;
created_at_device_time;
duration_ms;
byte_size;
codec;
sample_rate;
checksum;
sync_status;
button_gesture;
battery_level_at_capture.
Mobile UI Additions

Add placeholder UI states only.

In DeviceManagement screen show:

device storage usage;
unsynced recordings count;
last sync time;
sync now button;
sync errors.

In Timeline show pending state:

“Stored on dongle”
“Syncing from device”
“Uploaded”
“Processing”
“Ready”
Privacy Requirements

Because audio is stored on the dongle, add documentation for:

encryption at rest on dongle;
pairing-bound access;
secure erase;
lost-device scenario;
delete-after-sync setting;
retention policy;
visible recording indicator.

Important:

Never support stealth recording.

Recording must always have LED/vibration indication.

## Privacy Architecture

Autonomous dongle storage changes the threat model because private audio can exist on the device before the phone or backend sees it.

Future firmware and mobile sync must support:

- encryption at rest for every stored audio chunk;
- pairing-bound access so only the paired phone/account can list or transfer stored recordings;
- secure erase after backend confirmation or explicit user deletion;
- user-visible lost-device handling;
- delete-after-sync settings;
- retention limits for unsynced audio;
- visible LED/vibration recording indication.

The dongle must never support stealth recording. Recording starts only from an explicit physical gesture and must have visible or tactile feedback.

## Lost Device Behavior

If a dongle is marked lost or revoked:

- mobile should stop trusting new manifests from that hardware id;
- backend should reject new sync attempts for lost or revoked devices;
- already uploaded recordings remain governed by account retention settings;
- unsynced audio on the lost dongle is treated as potentially exposed unless device encryption is active.

## Secure Delete Policy

Stored audio should not be deleted from the dongle immediately after transfer to phone. The safer flow is:

```txt
transfer to phone
→ verify checksum
→ upload to backend
→ backend confirms durable recording
→ mark safe to delete
→ secure erase or crypto-erase dongle chunks
```

If sync fails before backend confirmation, the dongle should keep the recording unless the user explicitly deletes it.

Backend sync failure must not erase a successful phone transfer. The mobile app should treat these as separate phases:

```txt
dongle -> phone transfer
phone -> backend sync
```

If the first phase succeeds and the second phase fails, the local state remains `TRANSFERRED_TO_PHONE` and backend sync retries later. `SYNC_FAILED` is reserved for transfer/corruption failures or explicit backend failure states that need user attention.

Backend retry state should be persisted locally. The phone keeps a SQLite `dongle_backend_sync_queue` keyed by `device_id + local_recording_id`; reconnect handling retries queued backend metadata/status sync independently from dongle transfer.

Before real hardware exists, the mobile mock storage service should expose manual failure modes:

- `missing_chunk` for interrupted transfer simulation;
- `corrupt_chunk` for checksum mismatch simulation;
- reset and add-recording controls for repeated manual sync runs.
- manual backend retry control for testing the persistent queue without toggling device networking.
- reset should clear the mock storage and local backend retry queue together so manual scenarios start from a known state.
- manual active/lost device controls should be available while hardware is mocked so backend lost-device rejection can be tested.
- mobile UI should also block manual sync for locally-known non-active devices so lost-device behavior is visible before backend rejection.

Risks To Document

Document risks in /docs/dongle-storage.md:

flash wear;
battery drain during recording;
battery drain during sync;
incomplete writes;
corrupted chunks;
device clock drift;
lost device with stored audio;
interrupted sync;
low storage behavior;
legal/privacy implications.

## Risks

- Flash wear: append-only storage needs erase-block rotation and a clear maximum write-cycle assumption.
- Battery drain during recording: autonomous capture should stop safely on low battery instead of corrupting the log.
- Battery drain during sync: chunk transfer should be resumable and pause on low battery.
- Incomplete writes: event records need checksums and commit markers so firmware can recover after sudden power loss.
- Corrupted chunks: phone must verify chunk checksums before accepting a recording as transferred.
- Device clock drift: `created_at_device_time` is useful but not authoritative; phone sync time should also be stored.
- Lost device with stored audio: encryption and revocation are required before this becomes a production feature.
- Interrupted sync: sync must resume by manifest state and chunk index.
- Low storage behavior: firmware should refuse new recordings gracefully and indicate storage full.
- Legal/privacy implications: autonomous audio storage requires clear recording indication and retention controls.

MVP Boundary

This is future architecture only.

Do NOT block current MVP on this.

Current MVP remains:

phone-dependent capture
+ mock BLE
+ backend AI pipeline

Future hardware v2 may add:

autonomous local capture
+ SPI flash
+ delayed sync
Definition of Done

Task complete when:

/docs/dongle-storage.md exists;
shared enums/types are added;
mobile dongle storage interfaces are added;
mock dongle storage service exists;
API/data model extension is documented;
Prisma draft includes optional offline capture fields;
DeviceManagement placeholder includes storage/sync states;
README mentions this is planned hardware v2, not MVP v1.
