# API Contract

All product endpoints require Supabase Auth bearer JWT unless explicitly documented otherwise. Errors should use:

```json
{
  "error": "string",
  "message": "string",
  "statusCode": 400
}
```

## Users

### `GET /users/me`

Purpose: return the authenticated user profile.

Request body: none.

Response body: user profile.

Errors: `401` missing/invalid token.

## Devices

### `POST /devices/pair`

Purpose: pair a Bluetooth dongle with the authenticated user. The current MVP supports mock dongle pairing and stores the device in Postgres.

Request body: `PairDeviceDto`.

Response body: paired device.

Errors: `400` invalid payload, `409` device already paired.

### `GET /devices`

Purpose: list paired devices.

Request body: none.

Response body: device array.

Errors: `401` invalid token.

### `GET /devices/:id`, `PATCH /devices/:id`, `DELETE /devices/:id`

Purpose: read, update, or remove a paired device.

Request body: partial device update for `PATCH`, none otherwise.

Response body: device or deletion confirmation.

Errors: `404` not found.

### `PATCH /devices/:id/status`

Purpose: mark a device active, inactive, lost, or revoked.

Request body: `UpdateDeviceStatusDto`.

Response body: updated device.

Errors: `400` invalid status, `404` not found.

### Dongle storage sync architecture

Autonomous dongle storage runtime is not part of MVP v1, but the API includes architecture-level metadata/status endpoints for future hardware v2. Runtime audio chunk upload and BLE file synchronization are still not implemented.

The full future flow should support:

- list device manifest;
- register offline recording metadata;
- upload verified chunks or a reassembled local file;
- mark recording transferred to phone;
- mark recording uploaded to backend;
- mark recording safe to delete from dongle;
- resume or fail interrupted sync.

All future endpoints must be idempotent by `deviceId + localRecordingId`.

Lost or revoked devices must not be accepted for offline recording metadata/status sync.

## Capture

### `POST /capture/session`

Purpose: start a capture session from phone button, AirPods/Siri Shortcut, or dongle.

Request body: `CreateCaptureSessionDto` with source, optional button gesture/device, and `ContextSnapshot`.

Response body: capture session.

Errors: `400` invalid context, `403` device not owned by user.

### `PATCH /capture/session/:id/complete`

Purpose: complete capture, attach recording, create Memory Event, and enqueue AI pipeline.

Request body: `CompleteCaptureSessionDto`.

Response body: completed capture session.

Errors: `404` session not found, `409` already completed.

### `PATCH /capture/session/:id/cancel`

Purpose: cancel a capture session and clean temporary state.

Request body: none.

Response body: cancelled session.

Errors: `404` session not found.

## Recordings

### `POST /recordings`

Purpose: create recording metadata before upload.

Request body: `CreateRecordingDto`.

Response body: recording.

Errors: `400` invalid source or MIME type.

### `POST /recordings/:id/upload-url`

Purpose: create a signed Supabase Storage upload URL.

Request body: none.

Response body: bucket, path, signed URL.

Errors: `404` recording not found.

### `PATCH /recordings/:id/status`

Purpose: update recording state.

Request body: `UpdateRecordingStatusDto`.

Response body: updated recording.

Errors: `409` invalid state transition.

### `GET /recordings`, `GET /recordings/:id`, `DELETE /recordings/:id`

Purpose: list, read, or soft-delete recordings.

Request body: none.

Response body: recording data or deletion confirmation.

Errors: `404` not found.

### `POST /recordings/dongle/metadata`

Purpose: register metadata for a recording captured autonomously on a paired dongle. This is future hardware v2 architecture support; it does not transfer audio chunks.

Request body: `RegisterDongleRecordingMetadataDto`.

Response body: idempotent `Recording` row keyed by device and local recording id.

Errors: `400` invalid metadata, `404` paired device not found.

### `PATCH /recordings/dongle/status`

Purpose: update backend sync state for a device-origin recording.

Request body: `UpdateDongleRecordingSyncStatusDto`.

Response body: updated `Recording`.

Errors: `400` invalid sync status payload, `404` recording or paired device not found.

### `GET /recordings/dongle/:deviceId`

Purpose: list backend-known offline recordings for a paired dongle hardware id.

Request body: none.

Response body: recording array.

Errors: `404` paired device not found.

## Memory Events

### `POST /memory-events`

Purpose: create a Memory Event manually or from completed capture.

Request body: `CreateMemoryEventDto`.

Response body: Memory Event.

Errors: `400` invalid event type.

### `GET /memory-events`, `GET /memory-events/:id`, `PATCH /memory-events/:id`, `DELETE /memory-events/:id`

Purpose: list, read, update, or delete Memory Events.

Request body: `UpdateMemoryEventDto` for `PATCH`, none otherwise.

Response body: Memory Event data or deletion confirmation.

Errors: `404` not found.

## Memory Threads

### `GET /memory-threads`, `GET /memory-threads/:id`

Purpose: browse recurring semantic themes and inspect related memories.

Request body: none.

Response body: Memory Thread data with recent Memory Events and related Insights.

Errors: `404` not found.

## Notes

### `GET /notes`, `GET /notes/:id`, `PATCH /notes/:id`, `DELETE /notes/:id`

Purpose: browse, read, edit, or delete generated notes.

Request body: editable note fields for `PATCH`, none otherwise.

Response body: note data with related Memory Event, tags, action items, and reminders, or deletion confirmation.

Errors: `404` not found.

## Actions

### `GET /actions`, `PATCH /actions/:id`, `DELETE /actions/:id`

Purpose: manage extracted action items.

Request body: `UpdateActionItemDto` for `PATCH`, none otherwise.

Response body: action item data, including related note on list responses.

Errors: `404` not found.

## Reminders

### `GET /reminders`, `POST /reminders`, `PATCH /reminders/:id`, `DELETE /reminders/:id`

Purpose: list, create, update, or delete reminders.

Request body: `CreateReminderDto` or `UpdateReminderDto`.

Response body: reminder data, including related note on list responses.

Errors: `400` invalid reminder time, `404` not found.

## Insights

### `GET /insights`, `GET /insights/:id`, `PATCH /insights/:id`

Purpose: list rare contextual insights, inspect one insight, and mark read/unread.

Request body: `UpdateInsightDto` for `PATCH`, none otherwise.

Response body: insight data with related Memory Thread.

Errors: `404` not found.

## Timeline

### `GET /timeline`

Purpose: return user timeline built from Memory Events.

Request body: none.

Response body: Memory Events with recording, recording transcript, context snapshot, note, action items, reminders, tags, memory thread, and AI jobs.

Mobile uses these fields to show capture pipeline details:

- `recording.status`
- `recording.dongleSyncStatus`
- `recording.transcript.text`
- `processingStatus`
- `note.summary`
- `note.actionItems`
- `memoryThread.title`
- `aiJobs[].type`
- `aiJobs[].status`
- `aiJobs[].attempts`
- `aiJobs[].lastError`

Errors: `401` invalid token.

### `GET /daily-summary/:date`

Purpose: return generated day summary.

Request body: none.

Response body: daily summary.

Errors: `404` summary not found.

## Search

### `GET /search?q=`

Purpose: semantic and keyword search across user memory.

Request body: none.

Response body: keyword search results across notes and Memory Event titles/summaries. Semantic search is still a TODO after embedding provider integration.

Errors: `400` empty query if query is required by implementation.

## AI

### `POST /ai/reprocess/:recordingId`

Purpose: rerun AI pipeline from a recording.

Request body: none.

Response body: created `AiJob` and BullMQ queued job metadata.

Errors: `400` recording has no Memory Event, `404` recording not found.

### `POST /ai/reprocess-event/:eventId`

Purpose: rerun downstream AI jobs for a Memory Event.

Request body: none.

Response body: created `AiJob` and BullMQ queued job metadata.

Errors: `400` event has no recording, `404` event not found.
