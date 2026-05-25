import { ButtonGesture, CaptureSource, MemoryEventType, RecordingStatus } from '../enums';

export interface ContextSnapshot {
  timestamp: string;
  timezone: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  calendarContext?: string;
  deviceState?: Record<string, unknown>;
  appState?: Record<string, unknown>;
  captureSource: CaptureSource;
  buttonGesture?: ButtonGesture;
  nearbyDeviceId?: string;
  userSelectedProject?: string;
}

export interface MemoryEvent {
  id: string;
  userId: string;
  type: MemoryEventType;
  captureSource: CaptureSource;
  recordingId?: string;
  noteId?: string;
  contextSnapshotId?: string;
  occurredAt: string;
  title?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recording {
  id: string;
  userId: string;
  status: RecordingStatus;
  storageBucket: string;
  storagePath: string;
  durationMs?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: string;
  noteId: string;
  userId: string;
  title: string;
  completedAt?: string;
  dueAt?: string;
}

export interface Reminder {
  id: string;
  noteId?: string;
  userId: string;
  title: string;
  remindAt: string;
  dismissedAt?: string;
}

