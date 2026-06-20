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
  memoryEvent?: TimelineItem | null;
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

export interface MemoryHistoryItem {
  id: string;
  recordingId?: string | null;
  title?: string | null;
  type: string;
  occurredAt: string;
  createdAt: string;
  summary?: string | null;
}

export interface MemoryHistoryDay {
  date: string;
  count: number;
  memories: MemoryHistoryItem[];
}

export interface MemoryHistoryResponse {
  days: MemoryHistoryDay[];
  nextCursor: string | null;
  hasAnyMemory: boolean;
}

export type RecordingResultStatus =
  | 'uploading'
  | 'transcribing'
  | 'summarizing'
  | 'extracting'
  | 'saved'
  | 'failed';

export type RecordingResultDetectedType = 'note' | 'idea' | 'task' | 'reminder';

export interface RecordingResult {
  id: string;
  recordingId: string;
  captureSessionId?: string | null;
  status: RecordingResultStatus;
  error?: string | null;
  errorMessage?: string | null;
  detectedType: RecordingResultDetectedType;
  summary?: string | null;
  transcript?: string | null;
  note?: TimelineNote | null;
  tasks: ActionItem[];
  reminders: Reminder[];
  memoryEvent?: TimelineItem | null;
  relatedTopics: MemoryThread[];
  recording: Recording;
  aiJobs: AiJob[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyDigest {
  id?: string;
  date: string;
  summary?: string | null;
  importantEvents: string[];
  ideas: string[];
  tasks: string[];
  reminders: string[];
  openQuestions: string[];
  suggestedTomorrowFocus: string[];
  sources: Array<{
    id: string;
    type: 'note' | 'transcript' | 'memory_event' | 'task' | 'reminder' | 'recording';
    title?: string;
    snippet: string;
    createdAt: string;
  }>;
  generatedAt?: string | null;
  metadata?: unknown;
  hasDigest: boolean;
  generated: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type EntityType =
  | 'person'
  | 'project'
  | 'vehicle'
  | 'pet'
  | 'health'
  | 'place'
  | 'device'
  | 'home'
  | 'idea'
  | 'organization'
  | 'other';

export interface Entity {
  id: string;
  userId: string;
  name: string;
  normalizedName?: string;
  type: EntityType;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
  latestActivity?: string | null;
  mentionsCount?: number;
}

export interface EntityMention {
  id: string;
  entityId: string;
  noteId?: string | null;
  transcriptId?: string | null;
  memoryEventId?: string | null;
  recordingId?: string | null;
  confidence: number;
  createdAt: string;
  note?: TimelineNote | null;
  transcript?: Transcript | null;
  memoryEvent?: TimelineItem | null;
  recording?: Recording | null;
}

export interface EntityDetail extends Entity {
  mentions: EntityMention[];
}

export type EntityRelationType =
  | 'related_to'
  | 'part_of'
  | 'belongs_to'
  | 'works_on'
  | 'owns'
  | 'uses'
  | 'discussed_with'
  | 'affects'
  | 'located_at'
  | 'other';

export interface EntityRelation {
  id: string;
  userId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: EntityRelationType;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  sourceEntity?: Entity;
  targetEntity?: Entity;
}

export interface RelatedEntity {
  relation: EntityRelation;
  entity: Entity;
  direction: 'incoming' | 'outgoing';
}

export type AiSuggestionType =
  | 'follow_up'
  | 'unresolved_task'
  | 'reminder_candidate'
  | 'repeated_topic'
  | 'decision_needed'
  | 'continue_project'
  | 'review_memory';

export type AiSuggestionStatus = 'pending' | 'accepted' | 'dismissed' | 'done';

export interface AiSuggestion {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: AiSuggestionType;
  status: AiSuggestionStatus;
  relatedEntityId?: string | null;
  relatedNoteId?: string | null;
  relatedMemoryEventId?: string | null;
  createdAt: string;
  updatedAt: string;
  relatedEntity?: Entity | null;
  relatedNote?: TimelineNote | null;
  relatedMemoryEvent?: TimelineItem | null;
}

export interface InboxPayload {
  suggestions: AiSuggestion[];
  unresolvedTasks: ActionItem[];
  reminderCandidates: AiSuggestion[];
  failedSyncItems: unknown[];
  reviewMemories: TimelineItem[];
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
