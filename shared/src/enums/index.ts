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

export enum DongleConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECORDING = 'recording',
  LOW_BATTERY = 'low_battery',
  ERROR = 'error',
}

export enum AiJobType {
  TRANSCRIPTION = 'transcription',
  CLASSIFICATION = 'classification',
  SUMMARY = 'summary',
  ACTION_EXTRACTION = 'action_extraction',
  REMINDER_SUGGESTION = 'reminder_suggestion',
  EMBEDDING = 'embedding',
  TIMELINE_UPDATE = 'timeline_update',
  CLEANUP = 'cleanup',
}

