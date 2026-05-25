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

Purpose: pair a Bluetooth dongle with the authenticated user.

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

## Capture

### `POST /capture/session`

Purpose: start a capture session from mobile app or dongle.

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

## Notes

### `GET /notes`, `GET /notes/:id`, `PATCH /notes/:id`, `DELETE /notes/:id`

Purpose: browse, read, edit, or delete generated notes.

Request body: editable note fields for `PATCH`, none otherwise.

Response body: note data or deletion confirmation.

Errors: `404` not found.

## Actions

### `GET /actions`, `PATCH /actions/:id`, `DELETE /actions/:id`

Purpose: manage extracted action items.

Request body: `UpdateActionItemDto` for `PATCH`, none otherwise.

Response body: action item data.

Errors: `404` not found.

## Reminders

### `GET /reminders`, `POST /reminders`, `PATCH /reminders/:id`, `DELETE /reminders/:id`

Purpose: list, create, update, or delete reminders.

Request body: `CreateReminderDto` or `UpdateReminderDto`.

Response body: reminder data.

Errors: `400` invalid reminder time, `404` not found.

## Timeline

### `GET /timeline`

Purpose: return user timeline built from Memory Events.

Request body: none.

Response body: timeline entries.

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

Response body: search results.

Errors: `400` empty query if query is required by implementation.

## AI

### `POST /ai/reprocess/:recordingId`

Purpose: rerun AI pipeline from a recording.

Request body: none.

Response body: queued job state.

Errors: `404` recording not found.

### `POST /ai/reprocess-event/:eventId`

Purpose: rerun downstream AI jobs for a Memory Event.

Request body: none.

Response body: queued job state.

Errors: `404` event not found.

