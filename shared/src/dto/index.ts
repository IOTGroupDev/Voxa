import {
  ButtonGesture,
  CaptureSource,
  DeviceStatus,
  DongleRecordingSyncStatus,
  MemoryEventType,
  RecordingStatus,
} from '../enums';
import { ContextSnapshot, DongleAudioChunkDescriptor, DongleRecordingManifestItem } from '../types';

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export interface CreateCaptureSessionDto {
  source: CaptureSource;
  buttonGesture?: ButtonGesture;
  deviceId?: string;
  contextSnapshot: ContextSnapshot;
}

export interface CompleteCaptureSessionDto {
  recordingId: string;
  durationMs?: number;
}

export interface CreateRecordingDto {
  source: CaptureSource;
  deviceId?: string;
  mimeType: string;
  durationMs?: number;
}

export interface UpdateRecordingStatusDto {
  status: RecordingStatus;
}

export interface CreateMemoryEventDto {
  type: MemoryEventType;
  captureSource: CaptureSource;
  recordingId?: string;
  contextSnapshot?: ContextSnapshot;
  occurredAt: string;
}

export interface UpdateMemoryEventDto {
  type?: MemoryEventType;
  title?: string;
  summary?: string;
  importanceScore?: number;
  emotionalScore?: number;
}

export interface PairDeviceDto {
  deviceId: string;
  displayName?: string;
  firmwareVersion?: string;
  storageCapacityBytes?: number;
  storageUsedBytes?: number;
  supportsOfflineCapture?: boolean;
  firmwareStorageVersion?: string;
}

export interface UpdateDeviceStatusDto {
  status: DeviceStatus;
}

export interface RegisterDongleRecordingMetadataDto extends DongleRecordingManifestItem {}

export interface RequestDongleAudioChunkDto {
  deviceId: string;
  localRecordingId: string;
  chunkIndex: number;
}

export interface ConfirmDongleAudioChunkDto extends DongleAudioChunkDescriptor {
  deviceId: string;
  localRecordingId: string;
}

export interface UpdateDongleRecordingSyncStatusDto {
  deviceId: string;
  localRecordingId: string;
  syncStatus: DongleRecordingSyncStatus;
  error?: string;
}

export interface UpdateActionItemDto {
  title?: string;
  dueAt?: string;
  completedAt?: string | null;
}

export interface CreateReminderDto {
  noteId?: string;
  title: string;
  remindAt: string;
}

export interface UpdateReminderDto {
  title?: string;
  remindAt?: string;
  dismissedAt?: string | null;
}

export interface UpdateInsightDto {
  isRead?: boolean;
}
