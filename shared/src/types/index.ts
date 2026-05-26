import {
  ButtonGesture,
  CaptureAvailability,
  CaptureSource,
  DongleRecordingSyncStatus,
  AiJobStatus,
  AiJobType,
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

export interface CaptureAvailabilityState {
  availability: CaptureAvailability;
  canStartPhoneRecording: boolean;
  reason?: string;
}

export interface DongleRecordingManifestItem {
  deviceId: string;
  localRecordingId: string;
  createdAtDeviceTime: string;
  durationMs: number;
  byteSize: number;
  codec: string;
  sampleRate: number;
  checksum: string;
  syncStatus: DongleRecordingSyncStatus;
  buttonGesture?: ButtonGesture;
  batteryLevelAtCapture?: number;
  firmwareVersion?: string;
  errorFlags?: string[];
}

export interface DongleAudioChunkDescriptor {
  recordingId: string;
  chunkIndex: number;
  totalChunks: number;
  offset: number;
  size: number;
  checksum: string;
}

export interface DongleAudioChunk extends DongleAudioChunkDescriptor {
  payload: Uint8Array;
}

export interface DongleStorageSnapshot {
  deviceId: string;
  storageCapacityBytes?: number;
  storageUsedBytes?: number;
  unsyncedRecordingsCount: number;
  lastSyncAt?: string;
  syncError?: string;
  supportsOfflineCapture: boolean;
  firmwareStorageVersion?: string;
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
  dongleSyncStatus?: DongleRecordingSyncStatus;
  capturedOffline?: boolean;
  transcript?: Transcript | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transcript {
  id: string;
  userId: string;
  recordingId: string;
  language?: string;
  text: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineNote {
  id: string;
  title?: string;
  summary?: string;
  body?: string;
  actionItems?: ActionItem[];
  reminders?: Reminder[];
  noteTags?: Array<{
    tag?: {
      name?: string;
    };
  }>;
}

export interface AiJob {
  id: string;
  userId: string;
  type: AiJobType;
  status: AiJobStatus;
  recordingId?: string;
  memoryEventId?: string;
  attempts: number;
  lastError?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineItem extends MemoryEvent {
  recording?: Recording | null;
  note?: TimelineNote | null;
  memoryThread?: MemoryThread | null;
  aiJobs?: AiJob[];
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
