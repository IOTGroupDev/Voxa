import {
  ButtonGesture,
  CaptureSource,
  InsightType,
  MemoryEventType,
  RecordingStatus,
} from '../enums';

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
  memoryThreadId?: string;
  contextSnapshotId?: string;
  occurredAt: string;
  title?: string;
  summary?: string;
  importanceScore?: number;
  emotionalScore?: number;
  semanticHash?: string;
  processingStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryThread {
  id: string;
  userId: string;
  title: string;
  description?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  notesCount: number;
  importanceScore: number;
  unresolvedCount: number;
  emotionalTrend?: string;
  semanticClusterId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Insight {
  id: string;
  userId: string;
  type: InsightType;
  title: string;
  body: string;
  relatedThreadId?: string;
  relatedNoteIds: string[];
  importanceScore: number;
  isRead: boolean;
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
