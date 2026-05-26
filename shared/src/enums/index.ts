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
  AIRPODS_SHORTCUT = 'airpods_shortcut',
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

export enum InsightType {
  RECURRING_THEME = 'recurring_theme',
  UNRESOLVED_QUESTION = 'unresolved_question',
  SIMILAR_PAST_NOTE = 'similar_past_note',
  PROJECT_DIRECTION = 'project_direction',
  EMOTIONAL_PATTERN = 'emotional_pattern',
  FORGOTTEN_TASK = 'forgotten_task',
  DECISION_NEEDED = 'decision_needed',
}

export enum DongleConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECORDING = 'recording',
  LOW_BATTERY = 'low_battery',
  ERROR = 'error',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOST = 'lost',
  REVOKED = 'revoked',
}

export enum CaptureAvailability {
  READY = 'ready',
  PHONE_LOCKED_READY = 'phone_locked_ready',
  PHONE_BACKGROUND_LIMITED = 'phone_background_limited',
  PHONE_UNAVAILABLE = 'phone_unavailable',
}

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

export enum AiJobType {
  TRANSCRIPTION = 'transcription',
  CLASSIFICATION = 'classification',
  SUMMARY = 'summary',
  ACTION_EXTRACTION = 'action_extraction',
  REMINDER_SUGGESTION = 'reminder_suggestion',
  EMBEDDING = 'embedding',
  TIMELINE_UPDATE = 'timeline_update',
  INSIGHT = 'insight',
  CLEANUP = 'cleanup',
}
