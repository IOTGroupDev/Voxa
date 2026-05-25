import { ButtonGesture, CaptureSource, MemoryEventType, RecordingStatus } from '../enums';
import { ContextSnapshot } from '../types';

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
}

export interface PairDeviceDto {
  deviceId: string;
  displayName?: string;
  firmwareVersion?: string;
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

