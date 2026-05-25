export const STORAGE_BUCKETS = {
  AUDIO_PRIVATE: 'audio-private',
  USER_MEDIA: 'user-media',
} as const;

export const QUEUE_NAMES = {
  RECORDING_UPLOADED: 'recording_uploaded',
  TRANSCRIPTION: 'transcription_queue',
  CLASSIFICATION: 'classification_queue',
  SUMMARY: 'summary_queue',
  ACTION_EXTRACTION: 'action_extraction_queue',
  REMINDER_SUGGESTION: 'reminder_suggestion_queue',
  EMBEDDING: 'embedding_queue',
  TIMELINE_UPDATE: 'timeline_update_queue',
  CLEANUP: 'cleanup_queue',
} as const;

export const BLUETOOTH_SERVICE = {
  NAME: 'MemoryDongleControlService',
  CHARACTERISTICS: [
    'device_status',
    'battery_level',
    'button_event',
    'recording_state',
    'firmware_version',
    'device_id',
  ],
  COMMANDS: [
    'GET_STATUS',
    'GET_BATTERY',
    'SET_RECORDING_INDICATOR_ON',
    'SET_RECORDING_INDICATOR_OFF',
    'VIBRATE',
    'PING',
  ],
} as const;

