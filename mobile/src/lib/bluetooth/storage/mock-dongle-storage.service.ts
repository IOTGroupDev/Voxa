import { ButtonGesture, DongleRecordingManifestItem, DongleRecordingSyncStatus } from '@voxa/shared';
import { DongleStorageService } from './dongle-storage.types';
import { countUnsyncedDongleRecordings } from './dongle-recording-manifest';

const mockDeviceId = 'mock-dongle-001';

export type MockDongleStorageFailureMode = 'none' | 'missing_chunk' | 'corrupt_chunk';

export class MockDongleStorageService implements DongleStorageService {
  private lastSyncAt: string | undefined;
  private syncError: string | undefined;
  private failureMode: MockDongleStorageFailureMode = 'none';

  private manifest: DongleRecordingManifestItem[] = [this.createMockRecording()];

  async getStorageSnapshot(deviceId: string) {
    const items = await this.listStoredRecordings(deviceId);

    return {
      deviceId,
      storageCapacityBytes: 32 * 1024 * 1024,
      storageUsedBytes: items.reduce((total, item) => total + item.byteSize, 0),
      unsyncedRecordingsCount: countUnsyncedDongleRecordings(items),
      lastSyncAt: this.lastSyncAt,
      syncError: this.syncError,
      supportsOfflineCapture: true,
      firmwareStorageVersion: 'append-log-v0',
    };
  }

  async listStoredRecordings(deviceId: string) {
    return this.manifest.filter((item) => item.deviceId === deviceId);
  }

  async fetchRecordingMetadata(deviceId: string, localRecordingId: string) {
    return this.manifest.find((item) => item.deviceId === deviceId && item.localRecordingId === localRecordingId) ?? null;
  }

  async requestAudioChunk(deviceId: string, localRecordingId: string, chunkIndex: number) {
    const metadata = await this.fetchRecordingMetadata(deviceId, localRecordingId);
    if (!metadata) {
      return null;
    }

    if (this.failureMode === 'missing_chunk') {
      return null;
    }

    return {
      recordingId: localRecordingId,
      chunkIndex,
      totalChunks: 1,
      offset: 0,
      size: metadata.byteSize,
      checksum: this.failureMode === 'corrupt_chunk' ? 'mock-corrupt-checksum' : metadata.checksum,
      payload: new Uint8Array(),
    };
  }

  async confirmChunkReceived(deviceId: string, localRecordingId: string, chunk: { checksum: string }): Promise<void> {
    // Future BLE file sync will persist per-chunk acknowledgements for resume.
    const metadata = await this.fetchRecordingMetadata(deviceId, localRecordingId);
    if (!metadata) {
      throw new Error('Dongle recording metadata missing.');
    }

    if (chunk.checksum !== metadata.checksum) {
      throw new Error('Dongle recording chunk checksum mismatch.');
    }
  }

  async markRecordingTransferred(deviceId: string, localRecordingId: string): Promise<void> {
    this.updateStatus(deviceId, localRecordingId, DongleRecordingSyncStatus.TRANSFERRED_TO_PHONE);
    this.lastSyncAt = new Date().toISOString();
    this.syncError = undefined;
  }

  async markSafeToDelete(deviceId: string, localRecordingId: string): Promise<void> {
    this.updateStatus(deviceId, localRecordingId, DongleRecordingSyncStatus.SAFE_TO_DELETE_FROM_DEVICE);
  }

  async markSyncFailed(deviceId: string, localRecordingId: string, error: string): Promise<void> {
    this.updateStatus(deviceId, localRecordingId, DongleRecordingSyncStatus.SYNC_FAILED);
    this.syncError = error;
  }

  setFailureMode(failureMode: MockDongleStorageFailureMode): void {
    this.failureMode = failureMode;
  }

  getFailureMode(): MockDongleStorageFailureMode {
    return this.failureMode;
  }

  reset(): void {
    this.lastSyncAt = undefined;
    this.syncError = undefined;
    this.failureMode = 'none';
    this.manifest = [this.createMockRecording()];
  }

  addMockStoredRecording(): DongleRecordingManifestItem {
    const recording = this.createMockRecording(`mock-local-${String(this.manifest.length + 1).padStart(3, '0')}`);
    this.manifest.push(recording);
    return recording;
  }

  private updateStatus(deviceId: string, localRecordingId: string, syncStatus: DongleRecordingSyncStatus) {
    const item = this.manifest.find((recording) => recording.deviceId === deviceId && recording.localRecordingId === localRecordingId);
    if (item) {
      item.syncStatus = syncStatus;
    }
  }

  private createMockRecording(localRecordingId = 'mock-local-001'): DongleRecordingManifestItem {
    return {
      deviceId: mockDeviceId,
      localRecordingId,
      createdAtDeviceTime: new Date().toISOString(),
      durationMs: 12000,
      byteSize: 96000,
      codec: 'opus',
      sampleRate: 16000,
      checksum: `mock-checksum-${localRecordingId}`,
      syncStatus: DongleRecordingSyncStatus.STORED_ON_DEVICE,
      buttonGesture: ButtonGesture.SINGLE_PRESS,
      batteryLevelAtCapture: 76,
      firmwareVersion: 'mock-0.1.0',
    };
  }
}

export const mockDongleStorageService = new MockDongleStorageService();
