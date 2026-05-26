import {
  DongleAudioChunk,
  DongleAudioChunkDescriptor,
  DongleRecordingManifestItem,
  DongleRecordingSyncStatus,
  DongleStorageSnapshot,
  RegisterDongleRecordingMetadataDto,
  UpdateDongleRecordingSyncStatusDto,
} from '@voxa/shared';

export interface DongleStorageService {
  getStorageSnapshot(deviceId: string): Promise<DongleStorageSnapshot>;
  listStoredRecordings(deviceId: string): Promise<DongleRecordingManifestItem[]>;
  fetchRecordingMetadata(deviceId: string, localRecordingId: string): Promise<DongleRecordingManifestItem | null>;
  requestAudioChunk(
    deviceId: string,
    localRecordingId: string,
    chunkIndex: number,
  ): Promise<DongleAudioChunk | null>;
  confirmChunkReceived(deviceId: string, localRecordingId: string, chunk: DongleAudioChunkDescriptor): Promise<void>;
  markRecordingTransferred(deviceId: string, localRecordingId: string): Promise<void>;
  markSafeToDelete(deviceId: string, localRecordingId: string): Promise<void>;
  markSyncFailed(deviceId: string, localRecordingId: string, error: string): Promise<void>;
}

export interface DongleSyncResult {
  deviceId: string;
  attemptedRecordings: number;
  transferredRecordings: number;
  failedRecordings: number;
  backendSyncedRecordings: number;
  backendFailedRecordings: number;
  finalStatus?: DongleRecordingSyncStatus;
  error?: string;
}

export interface DongleSyncBackendClient {
  registerDongleRecordingMetadata(dto: RegisterDongleRecordingMetadataDto): Promise<unknown>;
  updateDongleRecordingSyncStatus(dto: UpdateDongleRecordingSyncStatusDto): Promise<unknown>;
}

export interface DongleBackendSyncQueueItem {
  id: string;
  deviceId: string;
  localRecordingId: string;
  metadataPayload: RegisterDongleRecordingMetadataDto;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface DongleBackendSyncQueue {
  enqueue(metadata: RegisterDongleRecordingMetadataDto, lastError?: string): Promise<DongleBackendSyncQueueItem>;
  list(): Promise<DongleBackendSyncQueueItem[]>;
  countPending(): Promise<number>;
  markAttempt(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
